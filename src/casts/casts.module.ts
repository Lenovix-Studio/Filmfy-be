import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CastsController } from './casts.controller';
import { CastsService } from './casts.service';

@Module({
  imports: [PrismaModule],
  controllers: [CastsController],
  providers: [CastsService],
})
export class CastsModule {}
