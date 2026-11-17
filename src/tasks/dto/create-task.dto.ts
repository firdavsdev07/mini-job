import { IsDateString, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * POST /tasks body'si. Validatsiya tayyor: noto'g'ri ma'lumotda avtomatik 400 qaytadi.
 * TODO(SWAGGER-2): har bir maydonga @ApiProperty / @ApiPropertyOptional qo'shing (description, example).
 */
export class CreateTaskDto {
  /** Task turi, masalan "email" yoki "report" */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  type: string;

  /** Task ma'lumotlari, ixtiyoriy JSON obyekt */
  @IsObject()
  payload: Record<string, unknown>;

  /** Bir xil key bilan qayta yuborilgan so'rov yangi task yaratmaydi */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  idempotencyKey: string;

  /** (BONUS) Task shu vaqtdan oldin ishlanmasin. ISO sana, masalan "2026-12-01T10:00:00Z" */
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
