import 'dotenv/config';
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as {
  prismaPool?: Pool;
  prismaAdapter?: PrismaPg;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error(
        'DATABASE_URL tidak ditemukan di environment variables (.env)',
      );
    }

    if (!globalForPrisma.prismaPool) {
      globalForPrisma.prismaPool = new Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
      });
      globalForPrisma.prismaAdapter = new PrismaPg(globalForPrisma.prismaPool);
    }

    super({ adapter: globalForPrisma.prismaAdapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

