import { Injectable } from "@nestjs/common";
import { CoreEventType } from "@atfm/db";
import { PrismaService } from "../prisma/prisma.service";

/// Publie les événements Core Directory dans la table core_events (MVP par polling,
/// avant introduction de Redis Streams/Kafka — voir section 4 du dossier de passation).
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async publish(type: CoreEventType, personId: string | null, personName: string, description: string) {
    return this.prisma.client.coreEvent.create({
      data: { type, personId, personName, description },
    });
  }

  async findRecent(limit = 100) {
    return this.prisma.client.coreEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
