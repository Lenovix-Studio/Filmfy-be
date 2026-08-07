import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // @Global() membuat PrismaService dapat diakses di mana saja tanpa import PrismaModule berulang kali
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}