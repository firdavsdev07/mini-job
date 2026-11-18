import { Injectable, Logger, NotImplementedException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Task } from '@prisma/client';
import { MockService } from '../mock/mock.service';
import { PrismaService } from '../prisma/prisma.service';

function readConfig() {
  return {
    workerEnabled: (process.env.WORKER_ENABLED ?? 'true') !== 'false',
    pollMs: Number(process.env.WORKER_POLL_MS ?? 1000),
    maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 3),
    retryBaseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS ?? 2000),
  };
}

export function computeBackoffMs(attempt: number, baseMs: number): number {
  throw new NotImplementedException('TODO(5): computeBackoffMs() ni yozing');
}

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private readonly config = readConfig();
  private timer?: NodeJS.Timeout;
  private inFlight: Promise<void> = Promise.resolve();
  private busy = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mock: MockService,
  ) {}

  onModuleInit() {
    if (!this.config.workerEnabled) {
      this.logger.warn("Worker o'chirilgan (WORKER_ENABLED=false)");
      return;
    }
    this.timer = setInterval(() => {
      if (this.busy) return;
      this.inFlight = this.tick();
    }, this.config.pollMs);
    this.logger.log(`Worker ishga tushdi (har ${this.config.pollMs} ms)`);
  }

  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.inFlight;
  }

  async tick(): Promise<void> {
    this.busy = true;
    try {
      const task = await this.claimNext();
      if (!task) return;
      await this.runTask(task);
    } catch (error) {
      this.logger.error(`tick() xatosi: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.busy = false;
    }
  }

  async claimNext(): Promise<Task | null> {
    throw new NotImplementedException('TODO(6): claimNext() ni yozing');
  }

  async runTask(task: Task): Promise<void> {
    throw new NotImplementedException('TODO(7): runTask() ni yozing');
  }
}
