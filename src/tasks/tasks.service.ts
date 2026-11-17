import { Injectable, NotImplementedException } from '@nestjs/common';
import { Task } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQuery } from './dto/list-tasks.query.dto';

export interface TaskStats {
  total: number;
  byStatus: Record<'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED', number>;
  /** COMPLETED tasklarning o'rtacha ishlash vaqti (ms). COMPLETED yo'q bo'lsa null */
  averageProcessingMs: number | null;
}

/**
 * Asosiy ishingiz shu yerda. Har bir metodda TODO bor.
 * Tartib bilan, yuqoridan pastga qarab bajaring va har birini Swagger UI (/docs) yoki curl bilan
 * qo'lda tekshiring (README.md dagi "Qabul mezonlari" jadvaliga qarang).
 *
 * Eslatma: DB bilan ishlash uchun `this.prisma.task.<metod>(...)` dan foydalaning.
 * Prisma hujjatlari: https://www.prisma.io/docs/orm/prisma-client/queries/crud
 */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * TODO(1): Task yaratish (idempotent).
   *
   * Qoida: bir xil `idempotencyKey` bilan so'rov ikki marta kelsa, ikkinchi marta
   * YANGI task yaratilmaydi, avvalgi task qaytariladi va `created: false` bo'ladi.
   *
   * Qadamlar:
   *  1. idempotencyKey bo'yicha mavjud taskni qidiring (findUnique). Topilsa: { task, created: false }
   *  2. Topilmasa yarating (create). payload ni `as Prisma.InputJsonObject` ga o'giring.
   *     Qaytaring: { task, created: true }
   *  3. Qiyin joyi: ikkita bir xil so'rov BIR VAQTDA kelsa, ikkalasi ham 1-qadamda "topilmadi" deydi,
   *     keyin biri create qiladi, ikkinchisi esa Prisma xatosi bilan yiqiladi (kod "P2002",
   *     unique constraint buzildi). Shu xatoni try/catch bilan ushlang va mavjud taskni qaytaring.
   *     Maslahat:  e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002'
   *
   * BONUS-1: dto.scheduledAt berilgan bo'lsa, `runAt` maydoniga new Date(dto.scheduledAt) yozing.
   */
  async create(dto: CreateTaskDto): Promise<{ task: Task; created: boolean }> {
    throw new NotImplementedException('TODO(1): create() ni yozing');
  }

  /**
   * TODO(2): Bitta taskni id bo'yicha qaytarish.
   * Topilmasa NotFoundException tashlang (HTTP 404).
   * (Bu metodni cancel() ham ishlatishi mumkin.)
   */
  async findOne(id: string): Promise<Task> {
    throw new NotImplementedException('TODO(2): findOne() ni yozing');
  }

  /**
   * TODO(3): Tasklar ro'yxati (filtr + pagination).
   *
   *  - query.status va query.type berilgan bo'lsa, shu bo'yicha filtrlang (where).
   *  - Eng yangisi birinchi (orderBy createdAt desc).
   *  - Pagination: skip = (page - 1) * limit, take = limit.
   *  - Qaytariladigan shakl:
   *      { data: Task[], meta: { total, page, limit } }
   *    `total`: filtrga mos BARCHA tasklar soni (faqat shu sahifadagisi emas, count() ishlating).
   */
  async findAll(query: ListTasksQuery): Promise<{
    data: Task[];
    meta: { total: number; page: number; limit: number };
  }> {
    throw new NotImplementedException('TODO(3): findAll() ni yozing');
  }

  /**
   * TODO(4): Taskni bekor qilish.
   *
   * Qoida: faqat PENDING task bekor qilinadi (CANCELLED bo'ladi).
   *  - task yo'q            -> 404 (NotFoundException)
   *  - task PENDING emas    -> 409 (ConflictException)
   *
   * Maslahat: oddiy "findUnique, keyin update" yo'li XAVFLI. Tekshiruv bilan yangilash
   * orasida worker taskni PROCESSING qilib qo'yishi mumkin. Buning o'rniga bitta atomik so'rov:
   *   updateMany({ where: { id, status: 'PENDING' }, data: { status: 'CANCELLED' } })
   * `count === 1` bo'lsa bekor qilindi. Aks holda task yo'q yoki PENDING emas ekan, qaysi biri
   * ekanini ajratish uchun findUnique ishlating.
   */
  async cancel(id: string): Promise<Task> {
    throw new NotImplementedException('TODO(4): cancel() ni yozing');
  }

  /**
   * BONUS-2: Statistika (GET /tasks/stats).
   *
   * Qaytaring:
   *  {
   *    total: 4,
   *    byStatus: { PENDING: 2, PROCESSING: 0, COMPLETED: 1, FAILED: 0, CANCELLED: 1 },  // nollar ham bo'lsin
   *    averageProcessingMs: 2000   // COMPLETED tasklar: completedAt - startedAt o'rtachasi; yo'q bo'lsa null
   *  }
   * Maslahat: prisma.task.groupBy({ by: ['status'], _count: { _all: true } })
   */
  async getStats(): Promise<TaskStats> {
    throw new NotImplementedException('BONUS-2: getStats() ni yozing');
  }
}
