import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCodeTypeDto,
  UpdateCodeTypeDto,
  CreateCodeDetailDto,
  UpdateCodeDetailDto,
} from './dto/common-code.dto';

@Injectable()
export class CommonCodesService {
  constructor(private prisma: PrismaService) {}

  async createType(dto: CreateCodeTypeDto) {
    return this.prisma.codeTypes.create({
      data: dto,
    });
  }

  async findAllTypes() {
    const types = await this.prisma.codeTypes.findMany({
      include: {
        _count: {
          select: { details: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return types.map((type) => ({
      id: type.id,
      code: type.code,
      name: type.name,
      description: type.description,
      count: type._count.details,
    }));
  }

  async findOneType(id: string) {
    return this.prisma.codeTypes.findUnique({
      where: { id },
    });
  }

  async updateType(id: string, dto: UpdateCodeTypeDto) {
    return this.prisma.codeTypes.update({
      where: { id },
      data: dto,
    });
  }

  async removeType(id: string) {
    return this.prisma.codeTypes.delete({
      where: { id },
    });
  }

  async createDetail(typeCode: string, dto: CreateCodeDetailDto) {
    return this.prisma.codeDetails.create({
      data: {
        type_code: typeCode,
        ...dto,
      },
    });
  }

  async findAllDetails(typeCode: string) {
    return this.prisma.codeDetails.findMany({
      where: { type_code: typeCode },
      orderBy: { order: 'asc' },
    });
  }

  async updateDetail(id: string, dto: UpdateCodeDetailDto) {
    return this.prisma.codeDetails.update({
      where: { id },
      data: dto,
    });
  }

  async removeDetail(id: string) {
    return this.prisma.codeDetails.delete({
      where: { id },
    });
  }
}
