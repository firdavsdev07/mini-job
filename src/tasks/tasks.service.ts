import { Injectable, NotImplementedException } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query.dto';

export interface TaskStats {
  total: number;
  byStatus: Record<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED', number>;
  averageProcessingMs: number | null;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaskDto): Promise<{ task: Task; created: boolean }> {
    throw new NotImplementedException('TODO(1): create() ni yozing');
  }

  async findOne(id: string): Promise<Task> {
    throw new NotImplementedException('TODO(2): findOne() ni yozing');
  }

  async findAll(query: ListTasksQuery): Promise<{
    data: Task[];
    meta: { total: number; page: number; limit: number };
  }> {
    throw new NotImplementedException('TODO(3): findAll() ni yozing');
  }

  async cancel(id: string): Promise<Task> {
    throw new NotImplementedException('TODO(4): cancel() ni yozing');
  }

  async getStats(): Promise<TaskStats> {
    throw new NotImplementedException('BONUS-2: getStats() ni yozing');
  }
}
