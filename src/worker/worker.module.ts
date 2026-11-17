import { Module } from '@nestjs/common';
import { MockModule } from '../mock/mock.module';
import { WorkerService } from './worker.service';

@Module({
  imports: [MockModule],
  providers: [WorkerService],
  exports: [WorkerService],
})
export class WorkerModule {}
