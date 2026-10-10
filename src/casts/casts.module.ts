import { Module } from '@nestjs/common';
import { CastsController } from './casts.controller';
import { CastsService } from './casts.service';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CastsController],
  providers: [CastsService],
})
export class CastsModule {}
