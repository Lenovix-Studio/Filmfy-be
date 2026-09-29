import { Module } from '@nestjs/common';
import { CommonCodesService } from './common-codes.service';
import { CommonCodesController } from './common-codes.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CommonCodesController],
  providers: [CommonCodesService],
})
export class CommonCodesModule {}
