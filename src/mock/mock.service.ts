import { Injectable } from '@nestjs/common';

@Injectable()
export class MockService {
  async processTask(payload: unknown): Promise<{ status: string; data: string }> {
    const delay = Math.floor(Math.random() * 3000) + 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const success = Math.random() < 0.75;
    if (!success) {
      throw new Error(`Failed to process task with payload: ${JSON.stringify(payload)}`);
    }
    return { status: 'success', data: `Processed task with payload: ${JSON.stringify(payload)}` };
  }
}
