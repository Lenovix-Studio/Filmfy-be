import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';
import { DATABASE_URL, NODE_ENV } from '@/common/constants/constant';

const envFile = NODE_ENV === 'development' ? '.env.dev' : '.env';
dotenv.config({ path: envFile });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: DATABASE_URL,
  },
});
