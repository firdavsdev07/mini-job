import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * GET /tasks query parametrlari:  /tasks?status=PENDING&type=email&page=2&limit=5
 * Validatsiya tayyor. `page` va `limit` yo'q bo'lsa 1 va 10 bo'ladi.
 * TODO(SWAGGER-2): har bir maydonga @ApiPropertyOptional qo'shing (enum, default, minimum/maximum).
 */
export class ListTasksQuery {
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
