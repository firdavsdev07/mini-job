import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global: boshqa modullarda qayta import qilish shart emas
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
