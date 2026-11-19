import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/db')
  async checkDb() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', message: 'Database terhubung' };
    } catch {
      return {
        status: 'error',
        statusCode: 503,
        error: 'DatabaseUnavailable',
        message: 'Database sedang mati atau tidak dapat dijangkau.',
      };
    }
  }
}
