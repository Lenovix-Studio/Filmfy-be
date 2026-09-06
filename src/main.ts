import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      bodyLimit: 10 * 1024 * 1024 * 1024,
    }),
  );

  const configService = app.get(ConfigService);

  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  await app.register(fastifyMultipart as any, {
    limits: {
      fileSize: 10 * 1024 * 1024 * 1024,
      files: 2,
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Filmfy API')
    .setDescription('API Dokumentasi Manajemen Film')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const storagePath =
    configService.get<string>('STORAGE_PATH') ||
    path.join(process.cwd(), 'infra/storage/dev');

  await app.register(fastifyStatic as any, {
    root: path.resolve(storagePath),
    prefix: '/storage/',
  });

  await app.listen(3001, '0.0.0.0');
  console.log(`Application is running on: http://localhost:3001/docs`);
}
bootstrap();
