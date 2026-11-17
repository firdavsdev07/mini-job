import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Kiruvchi ma'lumotni DTO bo'yicha tekshiradi: noto'g'ri bo'lsa avtomatik 400 qaytaradi
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO'da yo'q maydonlarni olib tashlaydi
      forbidNonWhitelisted: true, // ortiqcha maydon kelsa 400
      transform: true, // query/body ni DTO class'iga va to'g'ri tiplarga o'giradi
    }),
  );
  app.enableShutdownHooks(); // Ctrl+C da worker va DB toza yopiladi

  // TODO(SWAGGER-1): Swagger UI ni ulang, README.md dagi "SWAGGER" bo'limiga qarang.
  // Shu yerga yoziladi (listen'dan oldin). Natija: http://localhost:3000/docs

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
