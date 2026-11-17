import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { TasksModule } from './tasks/tasks.module';
import { WorkerModule } from './worker/worker.module';

@Module({
  imports: [PrismaModule, TasksModule, WorkerModule],
})
export class AppModule {}
