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

    let coverAbsolutePath = '';
    let coverRelativePath = '';
    let videoAbsolutePath = '';
    let videoRelativePath = '';
    let videoSize = BigInt(0);

    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'cover') {
          const uniqueFileName = `${uuidv4()}.webp`;
          coverAbsolutePath = path.join(STORAGE_PATHS.COVERS, uniqueFileName);
          coverRelativePath = `covers/${uniqueFileName}`;

          const imageTransformer = sharp()
            .resize({ width: 800, withoutEnlargement: true })
            .webp({ quality: 80 });

          await pipeline(
            part.file,
            imageTransformer,
            fs.createWriteStream(coverAbsolutePath),
          );
        } else if (part.fieldname === 'video') {
          const fileExt = path.extname(part.filename);
          const uniqueFileName = `${uuidv4()}${fileExt}`;
          videoAbsolutePath = path.join(STORAGE_PATHS.MOVIES, uniqueFileName);
          videoRelativePath = `movies/${uniqueFileName}`;

          const writeStream = fs.createWriteStream(videoAbsolutePath);

          await pipeline(part.file, writeStream);

          const stats = await fs.promises.stat(videoAbsolutePath);
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

    if (!coverRelativePath || !videoRelativePath) {
      if (coverAbsolutePath && fs.existsSync(coverAbsolutePath))
        await fs.promises.unlink(coverAbsolutePath);
      if (videoAbsolutePath && fs.existsSync(videoAbsolutePath))
        await fs.promises.unlink(videoAbsolutePath);
      throw new BadRequestException('Berkas cover dan video wajib diunggah.');
    }

    const dtoInstance = plainToInstance(CreateMovieDto, fields);
    const errors = await validate(dtoInstance);
    if (errors.length > 0) {
      if (coverAbsolutePath && fs.existsSync(coverAbsolutePath))
        await fs.promises.unlink(coverAbsolutePath);
      if (videoAbsolutePath && fs.existsSync(videoAbsolutePath))
        await fs.promises.unlink(videoAbsolutePath);
      throw new BadRequestException(errors);
    }

    try {
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
      if (coverAbsolutePath && fs.existsSync(coverAbsolutePath))
        await fs.promises.unlink(coverAbsolutePath);
      if (videoAbsolutePath && fs.existsSync(videoAbsolutePath))
        await fs.promises.unlink(videoAbsolutePath);
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
