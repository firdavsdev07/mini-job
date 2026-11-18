# Mini Job Queue: o'quv topshiriq

Stack: NestJS · Prisma · PostgreSQL · Swagger
Daraja: o'rta

---

## 1. Bu nima?

Sizdan email yuborish, hisobot yaratish kabi og'ir ishlarni orqa fonda bajaradigan kichik tizim yaratish so'raladi.

Mijoz API orqali "task" yuboradi. Server uni darrov bajarmaydi: bazaga yozib qo'yadi va javob qaytaradi. Alohida worker esa navbatdagi tasklarni birin-ketin olib ishlaydi:

```
  Mijoz ──POST /tasks──► API ──yozadi──► [ PostgreSQL ] ◄──oladi── Worker ──► MockService
                          │                                                     (2–5 soniya "ishlaydi",
                          └─► "Qabul qildim" (darrov javob)                      25% hollarda xato)
```

Hamma saytlar shunday ishlaydi: "Hisobotingiz tayyorlanmoqda, tayyor bo'lgach xabar beramiz".

> Bu topshiriqda test (unit/e2e) yozish shart emas. Ishingizni Swagger UI orqali o'zingiz tekshirasiz.

### Nimani o'rganasiz

| Mavzu | Qayerda uchraydi |
|---|---|
| Idempotency: bir xil so'rov ikki marta kelsa, ikki marta ishlamasin | TODO 1 |
| REST: status kodlar (201, 200, 404, 409), pagination, filtr | TODO 1–4 |
| Atomik amallar: tekshirish va yangilash orasida "poyga" (race condition) bo'lmasin | TODO 4, 6 |
| Retry + exponential backoff: yiqilganda aqlli qayta urinish | TODO 5, 7 |
| Task holatlari (state machine) | TODO 6, 7 |
| OpenAPI/Swagger: API'ni hujjatlash | SWAGGER-1, SWAGGER-2 |
| Prisma: `findUnique`, `create`, `updateMany`, `count`, `groupBy`, xatolarni ushlash | hammasida |

---

## 2. Tayyorlash (setup)

### 2.1. PostgreSQL

Sizga ishlayotgan Postgres kerak. Ikki yo'l (bittasini tanlang):

- Kompyuteringizga o'rnatish: Windows uchun https://www.postgresql.org/download/ dan installer; macOS: `brew install postgresql@16`; Ubuntu: `sudo apt install postgresql`.
  O'rnatish paytida bergan parolingizni eslab qoling.
- Bepul cloud: https://neon.tech da ro'yxatdan o'tib, tayyor "connection string" olasiz.

Keyin `jobqueue` nomli baza yarating (cloud ishlatsangiz, bu kerak emas):

```bash
psql -U postgres -c "CREATE DATABASE jobqueue;"
```

### 2.2. Loyihani olish va ishga tushirish

Node.js 22 yoki undan yangi versiya kerak. Ilova ishga tushganda `.env` avtomatik yuklanadi.

| O'zgaruvchi | Standart qiymat | Vazifasi |
|---|---|---|
| `DATABASE_URL` | `.env.example` dagi lokal ulanish | PostgreSQL manzili; foydalanuvchi, parol va baza nomini o'zingiznikiga moslang |
| `PORT` | `3000` | HTTP server porti |
| `WORKER_ENABLED` | `true` | `false` bo'lsa worker ishlamaydi |
| `WORKER_POLL_MS` | `1000` | Navbatni tekshirish oralig'i, ms |
| `MAX_ATTEMPTS` | `3` | Task uchun maksimal urinishlar soni |
| `RETRY_BASE_DELAY_MS` | `2000` | Birinchi qayta urinishgacha kutish, ms |

```bash
git clone <REPO-MANZILI>
cd mini-job-queue

# O'z branchingizni oching. main da ishlamang!
git checkout -b solution/ism-familiya

npm install

cp .env.example .env          # Windows (cmd):  copy .env.example .env
# .env ni oching va DATABASE_URL dagi parolni o'zingiznikiga almashtiring

npx prisma db push            # jadvallarni bazada yaratadi va Prisma client'ni tayyorlaydi
npm run start:dev             # server http://localhost:3000 da ishga tushadi
```

Hammasi to'g'ri bo'lsa, konsolda `Worker ishga tushdi` yozuvi chiqadi. Hozircha so'rovlar `501 Not Implemented` qaytaradi, bu normal, chunki siz hali kodni yozmadingiz.

> Bazani brauzerda ko'rish uchun: `npx prisma studio`

---

## 3. Loyiha tuzilmasi

```
prisma/schema.prisma           Task jadvali (TAYYOR)
src/
  main.ts                      ★ SWAGGER-1 shu yerda
  tasks/
    tasks.controller.ts        HTTP route'lar (mantiqi TAYYOR, ★ SWAGGER-2 da dekorator qo'shasiz)
    tasks.service.ts           ★ SIZ YOZASIZ: TODO 1, 2, 3, 4 (+ BONUS)
    dto/                       Kiruvchi ma'lumot validatsiyasi (TAYYOR, ★ SWAGGER-2)
  worker/
    worker.service.ts          ★ SIZ YOZASIZ: TODO 5, 6, 7 (aylanish/tsikl qismi tayyor)
  mock/mock.service.ts         "Haqiqiy ish" (2–5 s, ~25% xato)  (TAYYOR, tegmang)
  prisma/                      DB ulanishi (TAYYOR)
```

★ bilan belgilangan qismlarning vazifalari quyidagi jadvalda keltirilgan.

---

## 4. Task holatlari

```
                 ┌─────── bekor qilish (cancel) ───────► CANCELLED
                 │
   yaratildi ──► PENDING ──worker oladi──► PROCESSING ──muvaffaqiyat──► COMPLETED
                 ▲                              │
                 │                              │ xato
                 │      attempts < 3            ▼
                 └──── (runAt = hozir + backoff) ┤
                                                │ attempts >= 3
                                                └──────────────────────► FAILED
```

- `attempts`: nechta urinish boshlangan (worker taskni olganda 1 ga oshadi).
- `runAt`: task shu vaqtdan oldin ishlanmaydi. Retry kechikishi shu maydon orqali amalga oshadi.
- Yiqilgan task `FAILED` ga darrov o'tmaydi. U 3 martagacha urinadi, har safar kutish vaqti ikki barobar oshadi (2 s → 4 s → ...).

---

## 5. API

| Metod | Yo'l | Nima qiladi | Javoblar |
|---|---|---|---|
| `POST` | `/tasks` | Task yaratadi | `201` yangi, `200` shu key bilan task allaqachon bor, `400` noto'g'ri ma'lumot |
| `GET` | `/tasks/:id` | Bitta task | `200`, `404` |
| `GET` | `/tasks?status=&type=&page=&limit=` | Ro'yxat | `200`, `400` |
| `POST` | `/tasks/:id/cancel` | Bekor qilish (faqat `PENDING`) | `200`, `404` yo'q, `409` PENDING emas |
| `GET` | `/tasks/stats` | BONUS: statistika | `200` |

POST /tasks body:
```json
{
  "type": "email",
  "payload": { "to": "ali@example.com", "subject": "Salom" },
  "idempotencyKey": "order-1234-welcome-email"
}
```

GET /tasks javobi:
```json
{
  "data": [ { "id": "...", "type": "email", "status": "PENDING", "attempts": 0, "...": "..." } ],
  "meta": { "total": 37, "page": 1, "limit": 10 }
}
```

### Idempotency nima?

Tasavvur qiling, to'lov tugmasini bosdingiz, internet uzildi va brauzer so'rovni qayta yubordi. Server ikkita buyurtma yaratib qo'ysa, mijozdan ikki marta pul olinadi.

Yechim: mijoz har bir *mantiqiy amal* uchun o'ziga xos `idempotencyKey` yuboradi. Server shu key bilan task borligini ko'rsa, yangisini yaratmaydi, mavjudini qaytaradi.

---

## 6. Vazifalar

| # | Fayl | Nima qilasiz |
|---|---|---|
| SWAGGER-1 | `main.ts` | Swagger UI ni ulang (`/docs`). Birinchi shuni qiling, qolgan hamma ishni shu orqali tekshirasiz |
| 1 | `tasks.service.ts` `create()` | Idempotent task yaratish. Parallel so'rovlarda ham ishlashi kerak |
| 2 | `tasks.service.ts` `findOne()` | Task topish, yo'q bo'lsa 404 |
| 3 | `tasks.service.ts` `findAll()` | Filtr + pagination + `meta.total` |
| 4 | `tasks.service.ts` `cancel()` | Faqat PENDING ni bekor qilish (atomik) |
| 5 | `worker.service.ts` `computeBackoffMs()` | Kichik sof funksiya |
| 6 | `worker.service.ts` `claimNext()` | Taskni atomik egallash |
| 7 | `worker.service.ts` `runTask()` | Ishlash, muvaffaqiyat/yiqilish, retry, FAILED |
| SWAGGER-2 | controller + DTO'lar | API'ni to'liq hujjatlash (pastda) |

Tavsiya etilgan tartib: SWAGGER-1 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → SWAGGER-2.
Har bir qadamdan keyin `git commit` qiling.

### BONUS (asosiy qism tugagach)

- BONUS-1: `scheduledAt`: task kelajakdagi vaqtga rejalashtirilsin (`create()` ichida).
- BONUS-2: `GET /tasks/stats`: statuslar bo'yicha son va o'rtacha ishlash vaqti.

---

## 7. Swagger (OpenAPI)

Paketni o'zingiz o'rnatasiz: `npm install @nestjs/swagger`. Qo'llanma: https://docs.nestjs.com/openapi/introduction

### SWAGGER-1: UI ni ulash
- `main.ts` da Swagger'ni sozlang: sarlavha ("Mini Job Queue"), tavsif, versiya.
- UI http://localhost:3000/docs da ochilishi kerak. Shu yerdagi Try it out tugmasi bilan so'rovlarni yuborasiz.

### SWAGGER-2: to'liq hujjatlash

Talablar. Hammasi bajarilsa, `http://localhost:3000/docs-json` da hech narsa yetishmaydi:

1. Controller: `@ApiTags('tasks')`.
2. Har bir endpoint: `@ApiOperation({ summary })` va u qaytarishi mumkin bo'lgan har bir status kodi uchun javob (`@ApiResponse` yoki `@ApiOkResponse`, `@ApiCreatedResponse`, `@ApiNotFoundResponse` ...).
3. Request sxemalari: `CreateTaskDto` va `ListTasksQuery` ning har bir maydoni `@ApiProperty` / `@ApiPropertyOptional` bilan (description, example; `status` uchun enum; `page`/`limit` uchun default va chegaralar).
4. Response sxemalari: Swagger'da javob tanasi ko'rinib turishi uchun alohida DTO class'lar yarating (masalan: `TaskResponseDto`, `ListTasksResponseDto` ichida `data` va `meta`, xato uchun `ErrorResponseDto`) va ularni `@ApiResponse({ type: ... })` ga bering.
5. `:id` parametri `@ApiParam` bilan tavsiflansin.
6. Tekshiring: `/docs` da hamma endpoint'ning "Responses" bo'limida status kodlar va sxemalar (Schemas) ko'rinadi, "Example Value" bo'sh `{}` emas.

---

## 8. Qabul mezonlari (qanday tekshiraman?)

Test yo'q, shuning uchun har bir vazifaning "tayyor" ekanini shu jadval bo'yicha o'zingiz tekshirasiz (Swagger UI yoki curl bilan).

| Vazifa | Qiling | Kutilgan natija |
|---|---|---|
| 1 | To'g'ri body bilan `POST /tasks` | `201`, `status: "PENDING"`, `attempts: 0` |
| | Xuddi shu body'ni qayta yuboring | `200`, ayni shu `id`, `GET /tasks` da bitta task |
| | `type` ni bo'sh qiling / `payload` ga `"matn"` bering / ortiqcha maydon qo'shing | `400` |
| 2 | `GET /tasks/{id}` (mavjud id) / noma'lum id | `200` / `404` |
| 3 | 12 ta task yarating, `GET /tasks` | 10 ta task, `meta: { total: 12, page: 1, limit: 10 }`, eng yangisi birinchi |
| | `?page=2` | 2 ta task |
| | `?status=COMPLETED`, `?type=email` | faqat mos tasklar, `meta.total` ham filtrga mos |
| | `?limit=1000`, `?page=0`, `?status=YOLGON` | `400` |
| 4 | PENDING taskni `cancel` | `200`, `status: "CANCELLED"` |
| | Shu taskni yana `cancel` | `409` |
| | Task worker olib ishlayotgan paytda (yaratgandan 1–2 s keyin) `cancel` | `409` |
| | Noma'lum id | `404` |
| 5 | `computeBackoffMs(1, 1000)`, `(2, 1000)`, `(3, 1000)` | `1000`, `2000`, `4000` (vaqtincha `console.log` bilan tekshiring) |
| 6 | 3 ta task yarating, 5–10 s kuzating (`GET /tasks`) | Tasklar navbat bilan `PROCESSING` ga o'tadi, bir vaqtda bittadan |
| | Postgres'da qatorni qo'lda `runAt` = 1 daqiqadan keyin qiling | Worker unga 1 daqiqa tegmaydi |
| 7 | Task yarating va kuzating | Odatda `COMPLETED`, `attempts: 1`, `startedAt` va `completedAt` bor |
| | Ba'zi tasklar yiqiladi (~25%): | `attempts: 2` yoki `3`, `lastError` to'ldirilgan; retrylar orasida kutish ~2 s, keyin ~4 s |
| | 3 marta yiqilgan task | `FAILED`, `attempts: 3`, boshqa o'zgarmaydi |
| | `CANCELLED` task | worker unga umuman tegmaydi |
| | 10 ta task yuboring | Har biri aynan bir marta ishlanadi (konsol loglaringizdan tekshiring) |
| BONUS-1 | `scheduledAt` = 30 s keyin | `runAt` shu vaqt; task 30 s PENDING qoladi, keyin ishlanadi |
| BONUS-2 | `GET /tasks/stats` | `{ total, byStatus: {PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED}, averageProcessingMs }` |

### curl misollari

```bash
# Task yaratish
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"type":"email","payload":{"to":"ali@example.com"},"idempotencyKey":"test-1"}'

# Ro'yxat
curl "http://localhost:3000/tasks?status=PENDING"

# Bekor qilish (ID ni almashtiring)
curl -X POST http://localhost:3000/tasks/<ID>/cancel
```

---

## 9. Qoidalar

1. `mock.service.ts` va `prisma/` ga tegmang. `tasks.controller.ts` va `dto/` ning mantiqini o'zgartirmang (Swagger dekoratorlari va yangi response DTO fayllari qo'shish mumkin).
2. Faqat bitta yangi paket o'rnatiladi: `@nestjs/swagger`.
3. Faqat o'z branchingizda ishlang (`solution/ism-familiya`), `main` ga hech narsa yubormang.
4. Kichik, ma'noli commit'lar qiling, masalan `TODO 1: idempotent create()`, "ish" yoki "fix" emas.
5. Kodni o'zingiz yozing. Topshirgandan keyin har qatorni tushuntira olishingiz kerak: kod ko'rib chiqishda (review) savol beriladi.

### Topshirish

```bash
git push -u origin solution/ism-familiya
```

GitHub'da Pull Request oching (`solution/ism-familiya` → `main`), lekin merge qilmang. PR tavsifiga yozing: nima qildingiz, qaysi qismi qiyin bo'ldi, nimani bilmay qoldingiz.

---

## 10. Baholash

| Qism | Ball |
|---|---|
| TODO 1–4 (API to'g'ri ishlaydi) | 30 |
| TODO 5 (backoff) | 10 |
| TODO 6 (atomik claim) | 15 |
| TODO 7 (worker, retry, FAILED) | 15 |
| SWAGGER-1 va SWAGGER-2 | 20 |
| Kod sifati: nomlash, tuzilma, commit'lar, PR tavsifi | 10 |
| BONUS | +10 |
| Jami | 100 (+10) |

---

## 11. O'ylab ko'ring (review'da so'raladi)

1. `claimNext()` da nega oddiy `findFirst` + `update` emas, aynan `updateMany({ where: { id, status: 'PENDING' } })` ishlatdik? Agar worker 2 ta bo'lsa nima bo'lardi?
2. Worker `PROCESSING` holatida o'lib qolsa (server o'chdi) task nima bo'ladi? Bu muammoni qanday hal qilardingiz?
3. Nega yiqilgan taskni darrov qayta urinmaymiz? Nega kutish vaqti ikki barobar oshadi?
4. Nega `idempotencyKey` ni server emas, mijoz beradi?
5. `cancel()` va worker bir vaqtda bitta taskga tegsa, kim yutadi? Buni qanday kafolatladingiz?

---

## 12. Muammolar

| Xato | Sabab |
|---|---|
| `Can't reach database server` (P1001) | Postgres ishlamayapti yoki `DATABASE_URL` dagi host/port noto'g'ri |
| `Authentication failed` (P1000) | `.env` dagi parol noto'g'ri |
| `database "jobqueue" does not exist` | 2.1 dagi `CREATE DATABASE` ni bajarmagansiz |
| `EADDRINUSE :3000` | 3000-port band: `PORT=3001 npm run start:dev` (Windows cmd: `set PORT=3001 && npm run start:dev`) |
| `Cannot find module '.prisma/client'` / `Task` topilmaydi | `npx prisma db push` yoki `npx prisma generate` ni bajaring |
| `501 Not Implemented` | Bu TODO hali yozilmagan |

Omad!
