import { BadRequestException } from '@nestjs/common';
import {
  ALLOWED_IMAGE_MIMES,
  ALLOWED_VIDEO_MIMES,
} from '@/common/constants/constant';
import { Transform } from 'stream';

export class FileValidator {
  static readonly MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
  static readonly MAX_VIDEO_SIZE = 15 * 1024 * 1024 * 1024; // 15GB

  static validateImageMime(mimetype?: string): void {
    if (!mimetype || !ALLOWED_IMAGE_MIMES.includes(mimetype.toLowerCase())) {
      throw new BadRequestException(
        `Invalid image MIME type: ${mimetype || 'unknown'}. Allowed: ${ALLOWED_IMAGE_MIMES.join(', ')}`,
      );
    }
  }

  static validateVideoMime(mimetype?: string): void {
    if (!mimetype || !ALLOWED_VIDEO_MIMES.includes(mimetype.toLowerCase())) {
      throw new BadRequestException(
        `Invalid video MIME type: ${mimetype || 'unknown'}. Allowed: ${ALLOWED_VIDEO_MIMES.join(', ')}`,
      );
    }
  }

  static validateImageSize(sizeBytes: number): void {
    if (sizeBytes > this.MAX_IMAGE_SIZE) {
      throw new BadRequestException(
        `Image size exceeds maximum limit of 50MB. (Got ${sizeBytes} bytes)`,
      );
    }
  }

  static validateVideoSize(sizeBytes: number): void {
    if (sizeBytes > this.MAX_VIDEO_SIZE) {
      throw new BadRequestException(
        `Video size exceeds maximum limit of 15GB. (Got ${sizeBytes} bytes)`,
      );
    }
  }

  static checkMagicBytes(
    buffer: Buffer,
    expectedCategory: 'image' | 'video',
  ): boolean {
    if (!buffer || buffer.length < 4) return false;

    if (expectedCategory === 'image') {
      const isJpeg =
        buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
      const isPng =
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47;
      const isWebp =
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50;

      return isJpeg || isPng || isWebp;
    }

    if (expectedCategory === 'video') {
      const isMkvOrWebm =
        buffer[0] === 0x1a &&
        buffer[1] === 0x45 &&
        buffer[2] === 0xdf &&
        buffer[3] === 0xa3;
      const isMp4 =
        buffer.length >= 8 &&
        buffer[4] === 0x66 &&
        buffer[5] === 0x74 &&
        buffer[6] === 0x79 &&
        buffer[7] === 0x70;

      return isMkvOrWebm || isMp4;
    }

    return false;
  }

  static createMagicBytesValidator(
    expectedCategory: 'image' | 'video',
  ): Transform {
    let headerChecked = false;
    let headerBuffer = Buffer.alloc(0);

    return new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        if (!headerChecked) {
          headerBuffer = Buffer.concat([headerBuffer, chunk]);
          if (headerBuffer.length >= 12) {
            const isValid = FileValidator.checkMagicBytes(
              headerBuffer,
              expectedCategory,
            );
            if (!isValid) {
              return callback(
                new BadRequestException(
                  `Invalid file signature for ${expectedCategory}`,
                ),
              );
            }
            headerChecked = true;
            this.push(headerBuffer);
            headerBuffer = Buffer.alloc(0);
          }
        } else {
          this.push(chunk);
        }
        callback();
      },
      flush(callback) {
        if (headerBuffer.length > 0) {
          this.push(headerBuffer);
        }
        callback();
      },
    });
  }
}
