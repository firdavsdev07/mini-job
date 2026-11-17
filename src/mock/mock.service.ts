import { Injectable } from '@nestjs/common';

/**
 * "Haqiqiy ish" o'rnini bosuvchi soxta servis (masalan email yuborish yoki hisobot yaratish).
 * Bu faylni o'zgartirmang, siz uni faqat worker ichidan chaqirasiz.
 *
 * - 2–5 soniya "ishlaydi"
 * - taxminan 25% hollarda xato tashlaydi (throw new Error)
 */
@Injectable()
export class MockService {
  async processTask(payload: unknown): Promise<{ status: string; data: string }> {
    const delay = Math.floor(Math.random() * 3000) + 2000; // 2000–4999 ms
    await new Promise((resolve) => setTimeout(resolve, delay));

    const success = Math.random() < 0.75;
    if (!success) {
      throw new Error(`Failed to process task with payload: ${JSON.stringify(payload)}`);
    }
    return { status: 'success', data: `Processed task with payload: ${JSON.stringify(payload)}` };
  }
}
