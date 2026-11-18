import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  @IsObject()
  payload: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
