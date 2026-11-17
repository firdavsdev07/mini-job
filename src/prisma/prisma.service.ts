import { Injectable, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient'ni Nest provider'iga aylantiramiz.
 * Boshqa service'larda:  constructor(private readonly prisma: PrismaService) {}
 * va keyin:              this.prisma.task.findMany(...)
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnApplicationShutdown {
  async onModuleInit() {
    await this.$connect();
  }

  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
