import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

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

  async clearTempFolders() {
    const rootDir = path.resolve(process.cwd(), '..');
    const targetDirs = [
      path.join(rootDir, 'infra', 'storage', 'dev', 'temp'),
      path.join(rootDir, 'infra', 'storage', 'prod', 'temp'),
      path.join(rootDir, 'py-filmfy', 'temp_images'),
      path.join(rootDir, 'py-filmfy', 'temp_trailers'),
    ];

    let totalDeleted = 0;
    const details: { path: string; deleted: number; status: string }[] = [];

    for (const dir of targetDirs) {
      try {
        const entries = await fs.readdir(dir);
        let count = 0;
        for (const entry of entries) {
          const entryPath = path.join(dir, entry);
          await fs.rm(entryPath, { recursive: true, force: true });
          count++;
        }
        totalDeleted += count;
        details.push({ path: dir, deleted: count, status: 'cleared' });
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          await fs.mkdir(dir, { recursive: true });
          details.push({ path: dir, deleted: 0, status: 'created' });
        } else {
          details.push({
            path: dir,
            deleted: 0,
            status: `error: ${err.message}`,
          });
        }
      }
    }

    return {
      message: `Cache dan temporary folder berhasil dibersihkan (${totalDeleted} file/folder dihapus).`,
      totalDeleted,
      details,
    };
  }

  async getLogs() {
    try {
      const logs = await this.prisma.systemLogs.findMany({
        orderBy: { created_at: 'desc' },
        take: 500,
      });

      const formattedLogs = logs.map((log) => {
        const date = log.created_at;
        const yyyy = date.getFullYear();
        const MM = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        const ss = String(date.getSeconds()).padStart(2, '0');

        return {
          id: log.id,
          timestamp: `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`,
          level: log.level,
          message: log.message,
          source: log.source,
          request: log.request,
          response: log.response,
        };
      });

      return { data: formattedLogs };
    } catch (error) {
      console.error('Error reading logs:', error);
      throw new InternalServerErrorException(
        'Gagal mengambil data log dari database.',
      );
    }
  }

  async createLog(body: {
    level: string;
    message: string;
    source?: string;
    request?: any;
    response?: any;
  }) {
    try {
      await this.prisma.systemLogs.create({
        data: {
          level: body.level,
          message: body.message,
          source: body.source || 'External',
          request: body.request || null,
          response: body.response || null,
        },
      });
      return { message: 'Log created' };
    } catch (error) {
      console.error('Error creating log:', error);
      throw new InternalServerErrorException('Gagal membuat log.');
    }
  }

  async clearLogs() {
    try {
      await this.prisma.systemLogs.deleteMany();
      return { message: 'Semua log berhasil dihapus.' };
    } catch (error) {
      console.error('Error clearing logs:', error);
      throw new InternalServerErrorException('Gagal menghapus log.');
    }
  }
}
