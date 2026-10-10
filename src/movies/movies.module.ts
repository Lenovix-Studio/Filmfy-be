import { Module } from '@nestjs/common';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { ExtractService } from './extract.service';
import { ConfigModule } from '@nestjs/config';
import { MediaProcessingService } from '@/common/services/media-processing.service';

@Module({
  imports: [ConfigModule],
  controllers: [MoviesController],
  providers: [MoviesService, ExtractService, MediaProcessingService],
})
export class MoviesModule {}
