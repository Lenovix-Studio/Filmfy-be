import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  Req,
  BadRequestException,
  NotFoundException,
  Param,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { type FastifyRequest } from 'fastify';
import { MoviesService } from './movies.service';
import { STORAGE_PATHS } from '../common/constants/storage.constant';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { v4 as uuidv4 } from 'uuid';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import sharp from 'sharp';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) { }

  // API for get id movie
  @Get(':id')
  @ApiOperation({
    summary: 'Mendapatkan detail film berdasarkan ID',
    description:
      'Mengambil data lengkap film termasuk relasi studio, series, label, genre, director, cast, images, dan files.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'UUID dari film yang ingin dicari',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Berhasil mengambil detail film',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Film dengan ID yang diberikan tidak ditemukan',
  })
  async getMovieDetail(@Param('id') id: string) {
    return this.moviesService.findOne(id);
  }

  // API for get cover, code, title movie
  @Get()
  @ApiOperation({ summary: 'Mendapatkan daftar film untuk Homepage' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Berhasil mengambil daftar film',
  })
  async getHomepageMovies() {
    const data = await this.moviesService.findAllForHome();
    return {
      statusCode: HttpStatus.OK,
      message: 'Berhasil mengambil daftar film',
      data,
    };
  }

  // API for Upload
  @Post('upload')
  @ApiOperation({ summary: 'Upload film baru beserta cover dan metadata' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['cover', 'video', 'code', 'title'],
      properties: {
        cover: {
          type: 'string',
          format: 'binary',
          description: 'File gambar cover/poster (JPG/PNG/WEBP)',
        },
        video: {
          type: 'string',
          format: 'binary',
          description: 'File video film (MP4/MKV)',
        },
        code: { type: 'string', example: 'MOV-001' },
        title: { type: 'string', example: 'Inception' },
        overview: { type: 'string', example: 'Bercerita tentang....' },
        director: { type: 'string', example: 'Christopher Nolan' },
        studio: { type: 'string', example: 'Warner Bros' },
        label: { type: 'string', example: 'Legendary Pictures' },
        series: { type: 'string', example: 'Inception Collection' },
        genre: {
          type: 'array',
          items: { type: 'string' },
          example: ['Action', 'Sci-Fi'],
        },
        cast: {
          type: 'array',
          items: { type: 'string' },
          example: ['Leonardo DiCaprio', 'Elliot Page'],
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Film berhasil diunggah',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validasi gagal atau file kurang',
  })
  async uploadMovie(@Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request harus berupa multipart/form-data');
    }

    const parts = req.parts();
    const fields: Record<string, any> = {};

    const tempDir =
      (STORAGE_PATHS as any).TEMP ||
      path.resolve(STORAGE_PATHS.MOVIES, '../temp');

    await fs.promises.mkdir(tempDir, { recursive: true });

    let tempCoverPath = '';
    let tempVideoPath = '';
    let videoExt = '';
    let videoSize = BigInt(0);

    for await (const part of parts) {
      if (part.type === 'file') {
        const tempUuid = uuidv4();

        if (part.fieldname === 'cover') {
          tempCoverPath = path.join(tempDir, `temp_cover_${tempUuid}.webp`);

          const imageTransformer = sharp()
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 80 });

          await pipeline(
            part.file,
            imageTransformer,
            fs.createWriteStream(tempCoverPath),
          );
        } else if (part.fieldname === 'video') {
          videoExt = path.extname(part.filename) || '.mp4';
          tempVideoPath = path.join(
            tempDir,
            `temp_video_${tempUuid}${videoExt}`,
          );

          await pipeline(part.file, fs.createWriteStream(tempVideoPath));

          const stats = await fs.promises.stat(tempVideoPath);
          videoSize = BigInt(stats.size);
        } else {
          part.file.resume();
        }
      } else {
        const value = part.value;
        if (fields[part.fieldname]) {
          if (Array.isArray(fields[part.fieldname])) {
            fields[part.fieldname].push(value);
          } else {
            fields[part.fieldname] = [fields[part.fieldname], value];
          }
        } else {
          fields[part.fieldname] = value;
        }
      }
    }

    const cleanupTemp = async () => {
      if (tempCoverPath && fs.existsSync(tempCoverPath))
        await fs.promises.unlink(tempCoverPath);
      if (tempVideoPath && fs.existsSync(tempVideoPath))
        await fs.promises.unlink(tempVideoPath);
    };

    const dtoInstance = plainToInstance(CreateMovieDto, fields);
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      await cleanupTemp();
      throw new BadRequestException(errors);
    }

    const movieCode = dtoInstance.code.trim();
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const targetMovieDir = path.join(
      STORAGE_PATHS.MOVIES,
      year,
      month,
      day,
      movieCode,
    );
    await fs.promises.mkdir(targetMovieDir, { recursive: true });

    const shortUuidCover = uuidv4().substring(0, 8);
    const shortUuidVideo = uuidv4().substring(0, 8);

    const coverFileName = `${movieCode}_cover_${shortUuidCover}.webp`;
    const videoFileName = `${movieCode}_video_${shortUuidVideo}${videoExt}`;

    const coverAbsolutePath = path.join(targetMovieDir, coverFileName);
    const videoAbsolutePath = path.join(targetMovieDir, videoFileName);

    let coverRelativePath = '';
    let videoRelativePath = '';

    try {
      if (tempCoverPath) {
        await fs.promises.rename(tempCoverPath, coverAbsolutePath);
        coverRelativePath = `movies/${year}/${month}/${day}/${movieCode}/${coverFileName}`;
      }

      if (tempVideoPath) {
        await fs.promises.rename(tempVideoPath, videoAbsolutePath);
        videoRelativePath = `movies/${year}/${month}/${day}/${movieCode}/${videoFileName}`;
      }

      const result = await this.moviesService.createMovieWithFiles(
        dtoInstance,
        coverRelativePath,
        videoRelativePath,
        videoSize,
      );

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Film berhasil diunggah',
        data: result,
      };
    } catch (error) {
      await cleanupTemp();
      if (fs.existsSync(coverAbsolutePath))
        await fs.promises.unlink(coverAbsolutePath);
      if (fs.existsSync(videoAbsolutePath))
        await fs.promises.unlink(videoAbsolutePath);

      if (fs.existsSync(targetMovieDir)) {
        const remaining = await fs.promises.readdir(targetMovieDir);
        if (remaining.length === 0) {
          await fs.promises.rmdir(targetMovieDir);
        }
      }

      throw error;
    }
  }

  // API for reset
  @Patch(':id')
  @ApiOperation({ summary: 'Update metadata film' })
  async updateMovie(@Param('id') id: string, @Body() dto: UpdateMovieDto) {
    return this.moviesService.updateMovie(id, dto);
  }

  // API add screenshot
  @Post(':id/screenshots')
  @ApiOperation({ summary: 'Upload screenshot untuk film' })
  @ApiConsumes('multipart/form-data')
  async uploadScreenshot(@Param('id') id: string, @Req() req: FastifyRequest) {
    if (!req.isMultipart()) {
      throw new BadRequestException('Request harus berupa multipart/form-data');
    }

    const parts = req.parts();
    const uploadedImages: any[] = [];

    const movie = await this.moviesService.findOne(id);
    if (!movie) throw new NotFoundException('Film tidak ditemukan');

    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const targetMovieDir = path.join(
      STORAGE_PATHS.MOVIES,
      year,
      month,
      day,
      movie.code,
    );
    await fs.promises.mkdir(targetMovieDir, { recursive: true });

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'screenshot') {
        const shortUuid = uuidv4().substring(0, 8);
        const fileName = `${movie.code}_screenshot_${shortUuid}.webp`;
        const absolutePath = path.join(targetMovieDir, fileName);

        const imageTransformer = sharp()
          .resize({ width: 1280, withoutEnlargement: true })
          .webp({ quality: 85 });

        await pipeline(
          part.file,
          imageTransformer,
          fs.createWriteStream(absolutePath),
        );

        const relativePath = `movies/${year}/${month}/${day}/${movie.code}/${fileName}`;
        const image = await this.moviesService.addScreenshot(id, relativePath);
        uploadedImages.push(image);
      } else {
        if (part.type === 'file') part.file.resume();
      }
    }

    return { message: 'Screenshot berhasil diunggah', data: uploadedImages };
  }

  @Delete('images/:imageId')
  @ApiOperation({ summary: 'Hapus gambar (cover/poster/screenshot)' })
  async deleteImage(@Param('imageId') imageId: string) {
    return this.moviesService.removeImage(imageId);
  }

  @Delete('reset')
  @ApiOperation({
    summary: 'RESET DATABASE: Hapus seluruh data di semua tabel',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Seluruh data berhasil dihapus',
  })
  async resetDatabase() {
    return await this.moviesService.resetAllTables();
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus film berdasarkan ID' })
  async deleteMovie(@Param('id') id: string) {
    return this.moviesService.deleteMovie(id);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Toggle status favorit film' })
  async toggleFavorite(@Param('id') id: string) {
    return this.moviesService.toggleFavorite(id);
  }

  @Get('favorites')
  @ApiOperation({ summary: 'Mendapatkan daftar film favorit' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Berhasil mengambil daftar favorit',
  })
  async getFavorites() {
    const data = await this.moviesService.findFavorites();
    return {
      statusCode: HttpStatus.OK,
      message: 'Berhasil mengambil daftar favorit',
      data,
    };
  }

  @Delete('favorites')
  @ApiOperation({ summary: 'Hapus semua film favorit' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Berhasil menghapus semua favorit',
  })
  async clearAllFavorites() {
    const result = await this.moviesService.clearAllFavorites();
    return {
      statusCode: HttpStatus.OK,
      message: `Berhasil menghapus ${result.count} favorit`,
    };
  }
}
