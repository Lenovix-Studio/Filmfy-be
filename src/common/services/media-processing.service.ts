import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import * as fs from 'fs';

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
        console.error(
          `Media processing failed for movie ${payload.movieId}`,
          error,
        );
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
    _type: 'cover' | 'gallery',
  ): Promise<void> {
    if (!fs.existsSync(filePath)) return;
    return;
  }

  on(event: string, listener: (...args: any[]) => void) {
    this.eventEmitter.on(event, listener);
  }
}
