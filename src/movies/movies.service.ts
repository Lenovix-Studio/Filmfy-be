import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovieDto } from './dto/create-movie.dto';

@Injectable()
export class MoviesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private getAbsolutePath(relativePath: string): string {
    if (!relativePath) return '';

    if (/^[a-zA-Z]:\\/.test(relativePath)) {
      return relativePath;
    }

    const storageRootEnv =
      this.configService.get<string>('STORAGE_PATH') ||
      this.configService.get<string>('STORAGE_ROOT');

    let baseStorageDir: string;

    if (storageRootEnv && /^[a-zA-Z]:\\/.test(storageRootEnv)) {
      baseStorageDir = storageRootEnv;
    } else if (storageRootEnv) {
      baseStorageDir = path.resolve(process.cwd(), storageRootEnv);
    } else {
      const appEnv =
        this.configService.get<string>('APP_ENV') ||
        this.configService.get<string>('NODE_ENV') ||
        'dev';
      const envFolder =
        appEnv === 'production' || appEnv === 'prod' ? 'prod' : 'dev';

      baseStorageDir = path.resolve(
        process.cwd(),
        '../infra/storage',
        envFolder,
      );
    }

    const cleanRelativePath = relativePath.replace(/^[/\\]+/, '');

    return path.join(baseStorageDir, cleanRelativePath);
  }

  private async removeEmptyDirsRecursively(dirPath: string) {
    try {
      const files = await fs.readdir(dirPath);
      if (files.length === 0) {
        await fs.rmdir(dirPath);

        const parentDir = path.dirname(dirPath);
        if (
          parentDir.endsWith('movies') ||
          parentDir.endsWith('covers') ||
          parentDir.endsWith('storage') ||
          parentDir.endsWith('dev') ||
          parentDir.endsWith('prod') ||
          (!parentDir.includes('movies') && !parentDir.includes('covers'))
        ) {
          return;
        }

        await this.removeEmptyDirsRecursively(parentDir);
      }
    } catch {}
  }

  private async cleanupFiles(filePaths: (string | null | undefined)[]) {
    for (const filePath of filePaths) {
      if (!filePath) continue;
      try {
        const absolutePath = this.getAbsolutePath(filePath);
        await fs.unlink(absolutePath);

        const parentDir = path.dirname(absolutePath);
        await this.removeEmptyDirsRecursively(parentDir);
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.error(`cleanupFiles gagal di path: ${filePath}`, err);
        }
      }
    }
  }

  private async deletePhysicalFiles(filePaths: string[]) {
    const parentDirs = new Set<string>();

    for (const filePath of filePaths) {
      if (!filePath) continue;

      const absolutePath = this.getAbsolutePath(filePath);
      try {
        await fs.unlink(absolutePath);

        parentDirs.add(path.dirname(absolutePath));
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          console.warn(
            `[WARN] File tidak ditemukan di harddisk: ${absolutePath}`,
          );
        } else {
          console.error(
            `[ERROR] Gagal menghapus file fisik di path ${absolutePath}:`,
            err,
          );
        }
      }
    }

    for (const dir of parentDirs) {
      await this.removeEmptyDirsRecursively(dir);
    }
  }

  async createMovieWithFiles(
    dto: CreateMovieDto,
    coverPath: string,
    movieFilePath: string,
    movieFileSize: bigint,
    galleryPaths?: string[],
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const movie = await tx.movies.create({
          data: {
            code: dto.code,
            title: dto.title,
            overview: dto.overview,
            status: dto.status,
            country: dto.country,
            language: dto.language,
            release_date: dto.release_date
              ? new Date(dto.release_date)
              : undefined,
            runtime_minutes: dto.runtime_minutes,
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
          dto.director,
          tx.directors,
          tx.movieDirectors,
          'director_id',
        );
        await handleMasterRelation(
          dto.studio,
          tx.studios,
          tx.movieStudios,
          'studio_id',
        );
        await handleMasterRelation(
          dto.label,
          tx.labels,
          tx.movieLabels,
          'label_id',
        );
        await handleMasterRelation(
          dto.series,
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

        if (coverPath) {
          await tx.images.create({
            data: {
              movie_id: movie.id,
              image_type: 'cover',
              file_path: coverPath,
            },
          });
        }

        if (galleryPaths && galleryPaths.length > 0) {
          for (const gPath of galleryPaths) {
            await tx.images.create({
              data: {
                movie_id: movie.id,
                image_type: 'gallery',
                file_path: gPath,
              },
            });
          }
        }

        if (movieFilePath) {
          await tx.movieFiles.create({
            data: {
              movie_id: movie.id,
              file_path: movieFilePath,
              file_size: movieFileSize,
            },
          });
        }

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

  async resetAllTables() {
    try {
      const images = await this.prisma.images.findMany({
        select: { file_path: true },
      });
      const movieFiles = await this.prisma.movieFiles.findMany({
        select: { file_path: true },
      });

      const allFilePaths = [
        ...images.map((img) => img.file_path),
        ...movieFiles.map((mf) => mf.file_path),
      ];

      await this.deletePhysicalFiles(allFilePaths);

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
        message:
          'Berhasil mereset seluruh data tabel dan menghapus semua file serta folder terkait.',
      };
    } catch (err: any) {
      throw new InternalServerErrorException(
        `Gagal mereset database dan file: ${err.message}`,
      );
    }
  }

  async findAllForHome() {
    const movies = await this.prisma.movies.findMany({
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        images: {
          where: { image_type: 'cover' },
          select: { file_path: true },
          take: 1,
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    return movies.map((movie) => {
      const cover = movie.images[0]?.file_path || null;
      return {
        id: movie.id,
        code: movie.code,
        title: movie.title,
        coverPath: cover,
        status: movie.status || 'DELETED',
      };
    });
  }

  async findOne(id: string) {
    const rawMovie = await this.prisma.movies.findUnique({
      where: { id },
      include: {
        movie_studios: { include: { studio: true } },
        movie_series: { include: { series: true } },
        movie_labels: { include: { label: true } },
        movie_genres: { include: { genre: true } },
        movie_directors: { include: { director: true } },
        movie_casts: { include: { cast: true } },
        images: true,
        movie_files: true,
        favorite: true,
      },
    });

    if (!rawMovie) {
      throw new NotFoundException(`Film dengan ID "${id}" tidak ditemukan`);
    }

    return {
      id: rawMovie.id,
      code: rawMovie.code,
      title: rawMovie.title,
      originalTitle: rawMovie.original_title,
      overview: rawMovie.overview,
      status: rawMovie.status,
      releaseDate: rawMovie.release_date,
      runtimeMinutes: rawMovie.runtime_minutes,
      language: rawMovie.language,
      country: rawMovie.country,
      tmdbId: rawMovie.tmdb_id,
      imdbId: rawMovie.imdb_id,
      createdAt: rawMovie.created_at,
      updatedAt: rawMovie.updated_at,
      studios: rawMovie.movie_studios.map((item) => item.studio),
      series: rawMovie.movie_series.map((item) => item.series),
      labels: rawMovie.movie_labels.map((item) => item.label),
      genres: rawMovie.movie_genres.map((item) => item.genre),
      directors: rawMovie.movie_directors.map((item) => item.director),
      casts: rawMovie.movie_casts.map((item) => item.cast),
      images: rawMovie.images,
      files: rawMovie.movie_files.map((file) => ({
        ...file,
        file_size: file.file_size ? Number(file.file_size) : null,
      })),
      isFavorite: rawMovie.favorite != null,
    };
  }

  async deleteMovie(id: string) {
    const movie = await this.prisma.movies.findUnique({
      where: { id },
      include: { images: true, movie_files: true },
    });

    if (!movie) {
      throw new NotFoundException(`Film dengan ID ${id} tidak ditemukan`);
    }

    const filePaths = [
      ...movie.images.map((img) => img.file_path),
      ...movie.movie_files.map((mf) => mf.file_path),
    ].filter(Boolean);

    await this.deletePhysicalFiles(filePaths);
    await this.prisma.movies.delete({ where: { id } });

    return { statusCode: 200, message: 'Film berhasil dihapus' };
  }

  async toggleFavorite(id: string) {
    const movie = await this.prisma.movies.findUnique({ where: { id } });
    if (!movie) {
      throw new NotFoundException(`Film dengan ID ${id} tidak ditemukan`);
    }

    const existing = await this.prisma.favorites.findUnique({
      where: { movie_id: id },
    });

    if (existing) {
      await this.prisma.favorites.delete({ where: { movie_id: id } });
      return {
        statusCode: 200,
        isFavorite: false,
        message: 'Dihapus dari favorit',
      };
    } else {
      await this.prisma.favorites.create({ data: { movie_id: id } });
      return {
        statusCode: 200,
        isFavorite: true,
        message: 'Ditambahkan ke favorit',
      };
    }
  }

  async replaceCover(id: string, coverPath: string) {
    const existing = await this.prisma.images.findFirst({
      where: { movie_id: id, image_type: 'cover' },
    });

    if (existing) {
      await this.deletePhysicalFiles([existing.file_path]);
      await this.prisma.images.delete({ where: { id: existing.id } });
    }

    const newImage = await this.prisma.images.create({
      data: {
        movie_id: id,
        image_type: 'cover',
        file_path: coverPath,
      },
    });

    return { message: 'Cover berhasil diperbarui', data: newImage };
  }

  async replaceVideo(id: string, videoPath: string, fileSize: bigint) {
    const existing = await this.prisma.movieFiles.findFirst({
      where: { movie_id: id },
    });

    if (existing) {
      await this.deletePhysicalFiles([existing.file_path]);
      await this.prisma.movieFiles.delete({ where: { id: existing.id } });
    }

    const newFile = await this.prisma.movieFiles.create({
      data: {
        movie_id: id,
        file_path: videoPath,
        file_size: fileSize,
      },
    });

    return { message: 'Video berhasil diperbarui', data: newFile };
  }

  async updateMovie(id: string, dto: any) {
    const movie = await this.prisma.movies.findUnique({ where: { id } });
    if (!movie)
      throw new NotFoundException(`Film dengan ID ${id} tidak ditemukan`);

    const transactionJobs: any[] = [];

    if (dto.director !== undefined) {
      transactionJobs.push(
        this.prisma.movieDirectors.deleteMany({ where: { movie_id: id } }),
      );
    }
    if (dto.studio !== undefined) {
      transactionJobs.push(
        this.prisma.movieStudios.deleteMany({ where: { movie_id: id } }),
      );
    }
    if (dto.label !== undefined) {
      transactionJobs.push(
        this.prisma.movieLabels.deleteMany({ where: { movie_id: id } }),
      );
    }
    if (dto.series !== undefined) {
      transactionJobs.push(
        this.prisma.movieSeries.deleteMany({ where: { movie_id: id } }),
      );
    }
    if (dto.genre !== undefined) {
      transactionJobs.push(
        this.prisma.movieGenres.deleteMany({ where: { movie_id: id } }),
      );
    }
    if (dto.cast !== undefined) {
      transactionJobs.push(
        this.prisma.movieCasts.deleteMany({ where: { movie_id: id } }),
      );
    }

    const handleArray = async (
      table: any,
      relationTable: any,
      items: string[],
      fieldName: string,
      relFieldId: string,
    ) => {
      if (!items || items.length === 0) return;
      for (const name of items) {
        let rec = await (this.prisma as any)[table].findFirst({
          where: { [fieldName]: name },
        });
        if (!rec)
          rec = await (this.prisma as any)[table].create({
            data: { [fieldName]: name },
          });
        await (this.prisma as any)[relationTable].create({
          data: { movie_id: id, [relFieldId]: rec.id },
        });
      }
    };

    transactionJobs.push(
      this.prisma.movies.update({
        where: { id },
        data: {
          title: dto.title,
          code: dto.code,
          overview: dto.overview,
        },
      }),
    );

    await this.prisma.$transaction(transactionJobs);

    if (dto.director)
      await handleArray(
        'directors',
        'movieDirectors',
        dto.director,
        'name',
        'director_id',
      );
    if (dto.studio)
      await handleArray(
        'studios',
        'movieStudios',
        dto.studio,
        'name',
        'studio_id',
      );
    if (dto.label)
      await handleArray('labels', 'movieLabels', dto.label, 'name', 'label_id');
    if (dto.series)
      await handleArray(
        'series',
        'movieSeries',
        dto.series,
        'name',
        'series_id',
      );
    if (dto.genre)
      await handleArray('genres', 'movieGenres', dto.genre, 'name', 'genre_id');
    if (dto.cast)
      await handleArray('casts', 'movieCasts', dto.cast, 'name', 'cast_id');

    return { message: 'Metadata film berhasil diperbarui' };
  }

  async addScreenshot(id: string, imagePath: string) {
    return this.prisma.images.create({
      data: {
        movie_id: id,
        image_type: 'screenshot',
        file_path: imagePath,
      },
    });
  }

  async removeImage(imageId: string) {
    const image = await this.prisma.images.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException('Gambar tidak ditemukan');

    await this.deletePhysicalFiles([image.file_path]);
    await this.prisma.images.delete({ where: { id: imageId } });

    return { message: 'Gambar berhasil dihapus' };
  }

  async findFavorites() {
    const favorites = await this.prisma.favorites.findMany({
      include: {
        movie: {
          select: {
            id: true,
            code: true,
            title: true,
            images: {
              where: { image_type: 'cover' },
              select: { file_path: true },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return favorites.map((fav) => {
      const cover = fav.movie.images[0]?.file_path || null;
      return {
        id: fav.movie.id,
        code: fav.movie.code,
        title: fav.movie.title,
        posterUrl: cover,
        addedAt: fav.created_at,
        isFavorite: true,
      };
    });
  }

  async clearAllFavorites() {
    const count = await this.prisma.favorites.deleteMany({});
    return { count: count.count };
  }
}
