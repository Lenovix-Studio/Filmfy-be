import {
  Controller,
  Post,
  Delete,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiResponse,
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
import sharp from 'sharp';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

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
  @ApiResponse({ status: 201, description: 'Film berhasil diunggah' })
  @ApiResponse({ status: 400, description: 'Validasi gagal atau file kurang' })
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

    if (!tempCoverPath || !tempVideoPath) {
      await cleanupTemp();
      throw new BadRequestException('Berkas cover dan video wajib diunggah.');
    }

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

    const coverRelativePath = `movies/${year}/${month}/${day}/${movieCode}/${coverFileName}`;
    const videoRelativePath = `movies/${year}/${month}/${day}/${movieCode}/${videoFileName}`;

    try {
      await fs.promises.rename(tempCoverPath, coverAbsolutePath);
      await fs.promises.rename(tempVideoPath, videoAbsolutePath);

      const result = await this.moviesService.createMovieWithFiles(
        dtoInstance,
        coverRelativePath,
        videoRelativePath,
        videoSize,
      );

      return {
        statusCode: 201,
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

  @Delete('reset')
  @ApiOperation({
    summary: 'RESET DATABASE: Hapus seluruh data di semua tabel',
  })
  @ApiResponse({ status: 200, description: 'Seluruh data berhasil dihapus' })
  async resetDatabase() {
    return await this.moviesService.resetAllTables();
  }
}
