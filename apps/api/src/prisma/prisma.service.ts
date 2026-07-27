import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { prisma, PrismaClient } from "@atfm/db";

/// Enveloppe NestJS autour du client Prisma partagé (packages/db) pour bénéficier
/// du cycle de vie du module (connexion/déconnexion propres).
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: PrismaClient = prisma;

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
