import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CastsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const cast = await this.prisma.casts.findUnique({
      where: { id },
      include: {
        images: true,
        movie_casts: {
          include: {
            movie: {
              include: {
                images: true,
              },
            },
          },
        },
      },
    });

    if (!cast) {
      throw new NotFoundException('Cast not found');
    }

    return {
      ...cast,
      movies: cast.movie_casts.map((mc) => mc.movie),
    };
  }

  async update(id: string, data: { name?: string; bio?: string }) {
    return this.prisma.casts.update({
      where: { id },
      data,
    });
  }

  async addPhoto(id: string, filePath: string, isProfile = false) {
    if (isProfile) {
      return this.prisma.casts.update({
        where: { id },
        data: { profile_path: filePath },
      });
    }

    return this.prisma.images.create({
      data: {
        cast_id: id,
        file_path: filePath,
        image_type: 'cast_gallery',
      },
    });
  }
}
