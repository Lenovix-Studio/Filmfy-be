import 'dotenv/config';
import build from 'pino-abstract-transport';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default async function (opts: any) {
  return build(async function (source) {
    for await (const obj of source) {
      if (obj.level >= 40) {
        const levelStr = obj.level >= 50 ? 'ERROR' : 'WARN';
        try {
          await prisma.systemLogs.create({
            data: {
              level: levelStr,
              message: obj.msg || obj.message || 'No message',
              source: obj.context || 'System',
            },
          });
        } catch (e) {}
      }
    }
  });
}
