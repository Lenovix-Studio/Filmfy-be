import { Controller, Get, Param, Patch, Body, Post, Req } from '@nestjs/common';
import { CastsService } from './casts.service';
import type { FastifyRequest } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import { STORAGE_PATH } from '@/common/constants/constant';

@Controller('casts')
export class CastsController {
  constructor(private readonly castsService: CastsService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.castsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: { name?: string; bio?: string },
  ) {
    return this.castsService.update(id, data);
  }

  @Post(':id/profile')
  async uploadProfile(@Param('id') id: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) throw new Error('No file provided');

    const uploadDir = path.join(process.cwd(), `${STORAGE_PATH}/casts`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${data.filename}`;
    const filePath = path.join(uploadDir, fileName);
    await pipeline(data.file, fs.createWriteStream(filePath));

    const relativePath = `casts/${fileName}`;
    return this.castsService.addPhoto(id, relativePath, true);
  }

  @Post(':id/photos')
  async uploadPhoto(@Param('id') id: string, @Req() req: FastifyRequest) {
    const data = await req.file();
    if (!data) throw new Error('No file provided');

    const uploadDir = path.join(process.cwd(), `${STORAGE_PATH}/casts`);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${data.filename}`;
    const filePath = path.join(uploadDir, fileName);
    await pipeline(data.file, fs.createWriteStream(filePath));

    const relativePath = `casts/${fileName}`;
    return this.castsService.addPhoto(id, relativePath, false);
  }
}
