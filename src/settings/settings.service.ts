import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async resetData() {
    try {
      await this.prisma.$transaction([
        this.prisma.movieCasts.deleteMany(),
        this.prisma.movieDirectors.deleteMany(),
        this.prisma.movieGenres.deleteMany(),
        this.prisma.movieLabels.deleteMany(),
        this.prisma.movieSeries.deleteMany(),
        this.prisma.movieStudios.deleteMany(),
        this.prisma.images.deleteMany(),
        this.prisma.movieFiles.deleteMany(),
        this.prisma.movies.deleteMany(),
        this.prisma.casts.deleteMany(),
        this.prisma.directors.deleteMany(),
        this.prisma.genres.deleteMany(),
        this.prisma.labels.deleteMany(),
        this.prisma.series.deleteMany(),
        this.prisma.studios.deleteMany(),
      ]);

      const storagePath =
        this.configService.get<string>('STORAGE_PATH') ||
        path.join(process.cwd(), '../infra/storage/dev');

      const absoluteStoragePath = path.isAbsolute(storagePath)
        ? storagePath
        : path.resolve(process.cwd(), storagePath);

      try {
        const files = await fs.readdir(absoluteStoragePath);
        for (const file of files) {
          const filePath = path.join(absoluteStoragePath, file);
          await fs.rm(filePath, { recursive: true, force: true });
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error('Gagal menghapus isi STORAGE_PATH:', err);
          throw err;
        }
      }

      return {
        message: 'Seluruh data film dan file penyimpanan berhasil di-reset.',
      };
    } catch (error) {
      console.error('Error during resetData:', error);
      throw new InternalServerErrorException('Gagal mereset data.');
    }
  }
}
