import * as path from 'path';
import * as fs from 'fs';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MoviesModule } from './movies/movies.module';
import { CommonCodesModule } from './common-codes/common-codes.module';
import { SettingsModule } from './settings/settings.module';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'dev'
          ? '.env.dev'
          : '.env',
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
    CommonCodesModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
