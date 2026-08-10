import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovieDto } from './dto/create-movie.dto';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  private async cleanupFiles(filePaths: (string | null | undefined)[]) {
    for (const filePath of filePaths) {
      if (filePath) {
        try {
          const absolutePath = path.isAbsolute(filePath)
            ? filePath
            : path.join(process.cwd(), filePath);
          await fs.unlink(absolutePath);
        } catch {}
      }
    }
  }

  async createMovieWithFiles(
    dto: CreateMovieDto,
    coverPath: string,
    movieFilePath: string,
    movieFileSize: bigint,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const movie = await tx.movies.create({
          data: {
            code: dto.code,
            title: dto.title,
          },
        });

        const handleMasterRelation = async (
          names: string[] | undefined,
          masterDelegate: any,
          junctionDelegate: any,
          foreignKeyField: string,
        ) => {
          if (!names || names.length === 0) return;

          for (const rawName of names) {
            const name = rawName.trim();
            if (!name) continue;

            let record = await masterDelegate.findFirst({
              where: { name: { equals: name, mode: 'insensitive' } },
            });

            if (!record) {
              record = await masterDelegate.create({
                data: { name },
              });
            }

            await junctionDelegate.create({
              data: {
                movie_id: movie.id,
                [foreignKeyField]: record.id,
              },
            });
          }
        };

        await handleMasterRelation(
          dto.director ? [dto.director] : [],
          tx.directors,
          tx.movieDirectors,
          'director_id',
        );
        await handleMasterRelation(
          dto.studio ? [dto.studio] : [],
          tx.studios,
          tx.movieStudios,
          'studio_id',
        );
        await handleMasterRelation(
          dto.label ? [dto.label] : [],
          tx.labels,
          tx.movieLabels,
          'label_id',
        );
        await handleMasterRelation(
          dto.series ? [dto.series] : [],
          tx.series,
          tx.movieSeries,
          'series_id',
        );

        await handleMasterRelation(
          dto.genre,
          tx.genres,
          tx.movieGenres,
          'genre_id',
        );
        await handleMasterRelation(
          dto.cast,
          tx.casts,
          tx.movieCasts,
          'cast_id',
        );

        await tx.images.create({
          data: {
            movie_id: movie.id,
            image_type: 'cover',
            file_path: coverPath,
          },
        });

        await tx.movieFiles.create({
          data: {
            movie_id: movie.id,
            file_path: movieFilePath,
            file_size: movieFileSize,
          },
        });

        return movie;
      });
    } catch (error: any) {
      await this.cleanupFiles([coverPath, movieFilePath]);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Movie dengan kode '${dto.code}' sudah terdaftar.`,
        );
      }

      if (error.status) {
        throw error;
      }

      throw new InternalServerErrorException('Gagal membuat data film.');
    }
  }

  private async deletePhysicalFiles(filePaths: string[]) {
    for (const filePath of filePaths) {
      if (!filePath) continue;

      try {
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.join(process.cwd(), filePath);

        await fs.unlink(absolutePath);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`Gagal menghapus file di path ${filePath}:`, err);
        }
      }
    }
  }

  async resetAllTables() {
    try {
      const images = await this.prisma.images.findMany({
        select: { file_path: true },
      });
      const movieFiles = await this.prisma.movieFiles.findMany({
        select: { file_path: true },
      });

      await this.prisma.$executeRawUnsafe(`
        TRUNCATE TABLE 
          "movies",
          "genres",
          "casts",
          "directors",
          "studios",
          "labels",
          "series",
          "images",
          "movie_files",
          "movie_genres",
          "movie_casts",
          "movie_directors",
          "movie_studios",
          "movie_labels",
          "movie_series"
        RESTART IDENTITY CASCADE;
      `);

      const allFilePaths = [
        ...images.map((img) => img.file_path),
        ...movieFiles.map((mf) => mf.file_path),
      ];

      await this.deletePhysicalFiles(allFilePaths);

      return {
        statusCode: 200,
        message:
          'Berhasil mereset seluruh data tabel dan menghapus semua file fisik terkait.',
      };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Gagal mereset database dan file: ${err.message}`,
      );
    }
  }
}
