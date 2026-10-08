import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { ExtractService } from './extract.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  controllers: [MoviesController],
  providers: [MoviesService, ExtractService],
})
export class MoviesModule {}
