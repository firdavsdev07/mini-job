import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, Task } from '@prisma/client';
import { MockService } from '../mock/mock.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Sozlamalar. Default qiymatlar yetarli, ularni o'zgartirish shart emas.
 * (Kerak bo'lsa, ishga tushirishdan oldin muhit o'zgaruvchisi bilan berish mumkin.)
 */
function readConfig() {
  return {
    workerEnabled: (process.env.WORKER_ENABLED ?? 'true') !== 'false',
    /** worker DB'ni necha millisekundda bir tekshiradi */
    pollMs: Number(process.env.WORKER_POLL_MS ?? 1000),
    /** bitta task uchun maksimal urinishlar soni */
    maxAttempts: Number(process.env.MAX_ATTEMPTS ?? 3),
    /** birinchi retry kechikishi (ms); keyingilari ikki barobardan oshadi */
    retryBaseDelayMs: Number(process.env.RETRY_BASE_DELAY_MS ?? 2000),
  };
}

/**
 * TODO(5): Exponential backoff.
 *
 * Task yiqilganda uni darrov qayta urinmaymiz, har safar kutish vaqtini ikki barobar oshiramiz.
 * (Sabab: tashqi servis qulagan bo'lsa, uni tez-tez urib yana ko'proq yuklamaymiz.)
 *
 *   attempt = 1  ->  baseMs        (masalan 2000 ms)
 *   attempt = 2  ->  baseMs * 2    (4000 ms)
 *   attempt = 3  ->  baseMs * 4    (8000 ms)
 *
 * @param attempt nechanchi urinish yiqildi (1 dan boshlanadi)
 * @param baseMs  birinchi kutish vaqti
 * @returns       keyingi urinishgacha kutish (millisekund)
 *
 * Bu sof funksiya (DB'siz), shuning uchun eng oson boshlash joyi.
 * runTask() (TODO 7) shu funksiyadan foydalanadi.
 */
export function computeBackoffMs(attempt: number, baseMs: number): number {
  return baseMs * 2 ** (attempt - 1);
}

/**
 * Worker: orqa fonda navbatdagi tasklarni ishlaydigan "ishchi".
 *
 * Qanday ishlaydi (bu qism TAYYOR):
 *   - ilova ishga tushganda setInterval har `pollMs` millisekundda tick() ni chaqiradi
 *   - tick() bitta task oladi (claimNext) va uni ishlaydi (runTask)
 *   - oldingi tick tugamaguncha yangisi boshlanmaydi (`busy` bayrog'i)
 *   - ilova to'xtaganda, hozir ishlayotgan task tugashini kutadi
 *
 * Sizning ishingiz: claimNext() va runTask().
 */
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

  /** Bitta aylanish: task ol, ishla. Xato bo'lsa ham worker to'xtamaydi. */
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

  /**
   * TODO(6): Navbatdagi taskni "egallash" (claim).
   *
   * Vazifa: ishlashga tayyor eng eski PENDING taskni topib, uni PROCESSING qilib, qaytaring.
   * Hech narsa yo'q bo'lsa null qaytaring.
   *
   * "Tayyor" = status PENDING  VA  runAt <= hozirgi vaqt.
   * "Eng eski" = runAt bo'yicha o'sish tartibida, teng bo'lsa createdAt bo'yicha.
   *
   * ASOSIY QOIDA: bitta task hech qachon ikki marta bir vaqtda ishlanmasligi kerak.
   * (Kelajakda worker 2 ta bo'lishi mumkin, ikkalasi bir vaqtda claimNext() chaqiradi.)
   *
   * Noto'g'ri yo'l (bunday yozmang):
   *    const t = await findFirst(...);  await update({ where: { id: t.id }, data: { status: 'PROCESSING' } });
   *    Ikkala worker ham bir xil t ni ko'radi va ikkalasi ham uni "olganini" o'ylaydi!
   *
   * To'g'ri yo'l (atomik):
   *   1. findFirst bilan nomzodni toping (topilmasa return null)
   *   2. updateMany({
   *        where: { id: nomzod.id, status: 'PENDING' },     // <- shart yangilash ichida tekshiriladi
   *        data:  { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } },
   *      })
   *   3. result.count === 0 bo'lsa, boshqa worker tezroq olibdi -> return null
   *   4. count === 1 bo'lsa, taskni qayta o'qib (findUniqueOrThrow) qaytaring
   *      (updateMany yangilangan qatorni emas, faqat sonini qaytaradi)
   *
   * Shuning uchun attempts claim paytida oshadi: "1-urinish boshlandi" degan ma'no.
   */
  async claimNext(): Promise<Task | null> {
    const candidate = await this.prisma.task.findFirst({
      where: { status: 'PENDING', runAt: { lte: new Date() } },
      orderBy: [{ runAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    if (!candidate) return null;

    const result = await this.prisma.task.updateMany({
      where: { id: candidate.id, status: 'PENDING' },
      data: { status: 'PROCESSING', startedAt: new Date(), attempts: { increment: 1 } },
    });
    if (result.count === 0) return null;

    return this.prisma.task.findUniqueOrThrow({ where: { id: candidate.id } });
  }

  /**
   * TODO(7): Taskni ishlash va natijani DB'ga yozish.
   *
   * `task` allaqachon PROCESSING, `task.attempts` esa joriy urinish raqami (1, 2, 3...).
   *
   * Qadamlar:
   *  1. `await this.mock.processTask(task.payload)` ni chaqiring (u 2–5 soniya oladi va ~25% yiqiladi).
   *
   *  2. MUVAFFAQIYATLI bo'lsa:
   *       status = COMPLETED, completedAt = hozir, lastError = null
   *
   *  3. XATO tashlasa (catch):
   *       xato matni = error.message
   *       a) task.attempts >= this.config.maxAttempts bo'lsa  ->  status = FAILED, lastError = xato matni
   *          (urinishlar tugadi, boshqa qayta ishlanmaydi)
   *       b) aks holda (yana urinish bor)  ->  status = PENDING (navbatga qaytadi),
   *          lastError = xato matni,
   *          runAt = hozir + computeBackoffMs(task.attempts, this.config.retryBaseDelayMs)
   *          (claimNext() runAt dan oldin uni olmaydi, ya'ni kechikish ishlaydi)
   *
   * Maslahat: DB'ga yozish (update) ni try ichiga qo'ymang, aks holda DB xatosini "task yiqildi"
   * deb adashasiz. Avval natijani o'zgaruvchiga oling, keyin try/catch'dan TASHQARIDA yozing.
   *
   * Maslahat: this.logger.log(...) bilan har bir bosqichni konsolga yozib qo'ysangiz,
   * ishlashini kuzatish oson bo'ladi.
   */
  async runTask(task: Task): Promise<void> {
    this.logger.log(`Task ${task.id} boshlandi (urinish ${task.attempts})`);

    let errorMessage: string | null = null;
    try {
      await this.mock.processTask(task.payload);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    let data: Prisma.TaskUpdateInput;
    if (errorMessage === null) {
      data = { status: 'COMPLETED', completedAt: new Date(), lastError: null };
      this.logger.log(`Task ${task.id} COMPLETED`);
    } else if (task.attempts >= this.config.maxAttempts) {
      data = { status: 'FAILED', lastError: errorMessage };
      this.logger.warn(`Task ${task.id} FAILED (${task.attempts} urinish)`);
    } else {
      const delay = computeBackoffMs(task.attempts, this.config.retryBaseDelayMs);
      data = { status: 'PENDING', lastError: errorMessage, runAt: new Date(Date.now() + delay) };
      this.logger.warn(`Task ${task.id} yiqildi, ${delay} ms dan keyin qayta urinadi`);
    }

    await this.prisma.task.update({ where: { id: task.id }, data });
  }
}
