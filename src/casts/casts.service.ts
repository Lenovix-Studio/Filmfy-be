import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CastsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const casts = await this.prisma.casts.findMany({
      include: {
        _count: {
          select: { movie_casts: true },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return casts.map((c) => ({
      id: c.id,
      name: c.name,
      display_name: c.display_name,
      other_name: c.other_name,
      bio: c.bio,
      profile_path: c.profile_path,
      movies_count: c._count.movie_casts,
    }));
  }

  async findOne(id: string) {
    const cast = await this.prisma.casts.findUnique({
      where: { id },
      include: {
        images: true,
        social_media: true,
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

  async update(
    id: string,
    data: {
      name?: string;
      display_name?: string;
      other_name?: string;
      bio?: string;
      birth_date?: string | null;
      birth_place?: string | null;
      height?: number | null;
      body_notes?: string | null;
      bust?: number | null;
      cup?: string | null;
      waist?: number | null;
      hip?: number | null;
      agency?: string | null;
      debut_date?: string | null;
      social_media?: {
        platform: string;
        handle: string;
        url?: string | null;
      }[];
    },
  ) {
    const { social_media, birth_date, debut_date, ...rest } = data;

    return this.prisma.$transaction(async (tx) => {
      const updateData: Record<string, any> = { ...rest };
      if (birth_date !== undefined) {
        updateData.birth_date = birth_date ? new Date(birth_date) : null;
      }
      if (debut_date !== undefined) {
        updateData.debut_date = debut_date ? new Date(debut_date) : null;
      }

      const updated = await tx.casts.update({
        where: { id },
        data: updateData,
      });

      if (social_media !== undefined) {
        await tx.castSocialMedia.deleteMany({
          where: { cast_id: id },
        });

        if (social_media.length > 0) {
          const validSosmed = social_media
            .filter((s) => s.platform?.trim() && s.handle?.trim())
            .map((s) => ({
              cast_id: id,
              platform: s.platform.trim(),
              handle: s.handle.trim(),
              url: s.url?.trim() || null,
            }));

          if (validSosmed.length > 0) {
            await tx.castSocialMedia.createMany({
              data: validSosmed,
            });
          }
        }
      }

      return updated;
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
