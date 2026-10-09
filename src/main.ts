import * as path from 'path';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { PORT } from '../lib/constant';
import { STORAGE_PATHS } from './common/constants/storage.constant';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 10 * 1024 * 1024 * 1024,
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.register(fastifyMultipart as any, {
    limits: {
      fileSize: 10 * 1024 * 1024 * 1024,
      files: 50,
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Filmfy API')
    .setDescription('API Dokumentasi Manajemen Film')
    .setVersion('1.0')
    .build();

  if (process.env.SWAGGER_ENABLE !== 'false') {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const baseStoragePath = path.resolve(STORAGE_PATHS.COVERS, '..');

  await app.register(fastifyStatic as any, {
    root: baseStoragePath,
    prefix: '/storage/',
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.mp4') || filePath.endsWith('.mkv')) {
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  });

  const port = PORT || 4000;

  await app.listen(port, '0.0.0.0');

  console.log(`Application is running on: http://localhost:${port}/docs`);
}
bootstrap();
