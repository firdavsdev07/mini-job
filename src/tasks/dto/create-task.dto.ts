import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * POST /tasks body'si. Validatsiya tayyor: noto'g'ri ma'lumotda avtomatik 400 qaytadi.
 * TODO(SWAGGER-2): har bir maydonga @ApiProperty / @ApiPropertyOptional qo'shing (description, example).
 */
export class CreateTaskDto {
  /** Task turi, masalan "email" yoki "report" */
  @ApiProperty({ description: 'Task turi', example: 'email', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  /** Task ma'lumotlari, ixtiyoriy JSON obyekt */
  @ApiProperty({
    description: "Task ma'lumotlari (JSON obyekt)",
    type: 'object',
    additionalProperties: true,
    example: { to: 'ali@example.com', subject: 'Salom' },
  })
  @IsObject()
  payload: Record<string, unknown>;

  /** Bir xil key bilan qayta yuborilgan so'rov yangi task yaratmaydi */
  @ApiProperty({
    description: "Bir xil key bilan qayta yuborilgan so'rov yangi task yaratmaydi",
    example: 'order-1234-welcome-email',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey: string;

  /** (BONUS) Task shu vaqtdan oldin ishlanmasin. ISO sana, masalan "2026-12-01T10:00:00Z" */
  @ApiPropertyOptional({
    description: 'Task shu vaqtdan oldin ishlanmaydi (ISO sana)',
    example: '2026-12-01T10:00:00Z',
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
