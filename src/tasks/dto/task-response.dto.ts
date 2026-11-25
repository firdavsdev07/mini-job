import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export class TaskResponseDto {
  @ApiProperty({ format: 'uuid', example: '3f1c2a9e-6b7d-4e2a-9c1f-1a2b3c4d5e6f' })
  id: string;

  @ApiProperty({ example: 'email' })
  type: string;

  @ApiProperty({ type: 'object', additionalProperties: true, example: { to: 'ali@example.com', subject: 'Salom' } })
  payload: Record<string, unknown>;

  @ApiProperty({ enum: TaskStatus, example: TaskStatus.PENDING })
  status: TaskStatus;

  @ApiProperty({ example: 'order-1234-welcome-email' })
  idempotencyKey: string;

  @ApiProperty({ example: 0 })
  attempts: number;

  @ApiProperty({ type: String, nullable: true, example: null })
  lastError: string | null;

  @ApiProperty({ format: 'date-time', example: '2026-11-25T10:00:00.000Z' })
  runAt: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: null })
  startedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true, example: null })
  completedAt: Date | null;

  @ApiProperty({ format: 'date-time', example: '2026-11-25T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ format: 'date-time', example: '2026-11-25T10:00:00.000Z' })
  updatedAt: Date;
}

export class ListMetaDto {
  @ApiProperty({ example: 37 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}

export class ListTasksResponseDto {
  @ApiProperty({ type: [TaskResponseDto] })
  data: TaskResponseDto[];

  @ApiProperty({ type: ListMetaDto })
  meta: ListMetaDto;
}

export class StatusCountsDto {
  @ApiProperty({ example: 2 })
  PENDING: number;

  @ApiProperty({ example: 0 })
  PROCESSING: number;

  @ApiProperty({ example: 1 })
  COMPLETED: number;

  @ApiProperty({ example: 0 })
  FAILED: number;

  @ApiProperty({ example: 1 })
  CANCELLED: number;
}

export class TaskStatsResponseDto {
  @ApiProperty({ example: 4 })
  total: number;

  @ApiProperty({ type: StatusCountsDto })
  byStatus: StatusCountsDto;

  @ApiProperty({ type: Number, nullable: true, example: 2000 })
  averageProcessingMs: number | null;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Task topilmadi',
  })
  message: string | string[];

  @ApiProperty({ example: 'Not Found' })
  error: string;
}
