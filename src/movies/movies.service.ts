import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovieDto } from './dto/create-movie.dto';

@Injectable()
export class MoviesService {
  constructor(private readonly prisma: PrismaService) {}

  async createMovieWithFiles(
    dto: CreateMovieDto,
    coverPath: string,
    movieFilePath: string,
    movieFileSize: bigint,
  ) {
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
      await handleMasterRelation(dto.cast, tx.casts, tx.movieCasts, 'cast_id');

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
  }

  // RESET ALL TABLES (FOR TESTING PURPOSES)
  async resetAllTables() {
    try {
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

      return {
        statusCode: 200,
        message: 'Berhasil mereset seluruh data di semua tabel.',
      };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Gagal mereset database: ${err.message}`,
      );
    }
  }
}
