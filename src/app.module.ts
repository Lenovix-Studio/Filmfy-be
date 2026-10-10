import * as path from 'path';
import * as fs from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { CastsModule } from './casts/casts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MoviesModule } from './movies/movies.module';
import { CommonCodesModule } from './common-codes/common-codes.module';
import { SettingsModule } from './settings/settings.module';
import { ensureStorageDirectoriesExist } from './common/constants/storage.constant';
import { APP_ENV, NODE_ENV } from './common/constants/constant';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
ensureStorageDirectoriesExist();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        NODE_ENV === 'development' || APP_ENV === 'dev' ? '.env.dev' : '.env',
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: 'info',
        autoLogging: false,
        transport: {
          targets: [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                singleLine: true,
              },
            },
            {
              target: path.join(__dirname, 'prisma-log-transport.js'),
              level: 'warn',
              options: {},
            },
          ],
        },
      },
    }),
    PrismaModule,
    MoviesModule,
    CastsModule,
    CommonCodesModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
