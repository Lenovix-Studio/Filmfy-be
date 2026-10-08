import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

export interface MediaProcessingPayload {
  movieId: string;
  coverPath?: string;
  galleryPaths?: string[];
}

@Injectable()
export class MediaProcessingService {
  private eventEmitter = new EventEmitter();

  async processMediaAsync(payload: MediaProcessingPayload): Promise<void> {
    setImmediate(async () => {
      try {
        if (payload.coverPath) {
          await this.optimizeImage(payload.coverPath, 'cover');
        }
        if (payload.galleryPaths && payload.galleryPaths.length > 0) {
          await Promise.all(
            payload.galleryPaths.map((p) =>
              this.optimizeImage(p, 'gallery').catch((err) => {
                console.error(`Gallery image optimization failed: ${p}`, err);
              }),
            ),
          );
        }
        this.eventEmitter.emit('media.processed', {
          movieId: payload.movieId,
          status: 'completed',
        });
      } catch (error) {
        console.error(`Media processing failed for movie ${payload.movieId}`, error);
        this.eventEmitter.emit('media.processed', {
          movieId: payload.movieId,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });
  }
  private async optimizeImage(
    filePath: string,
    type: 'cover' | 'gallery',
  ): Promise<void> {
    if (!fs.existsSync(filePath)) return;

    const stats = await fs.promises.stat(filePath);
    if (stats.size === 0) return;

    try {
      const metadata = await sharp(filePath).metadata();
      const needsOptimization =
        metadata.size && metadata.size > 200 * 1024 && metadata.format !== 'webp';

      if (needsOptimization) {
        const maxWidth = type === 'cover' ? 1200 : 1920;
        await sharp(filePath)
          .resize(maxWidth, undefined, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(filePath + '.tmp');

        await fs.promises.rename(filePath + '.tmp', filePath);
      }
    } catch (error) {
      console.error(`Image optimization failed for ${filePath}:`, error);
    }
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }
}
