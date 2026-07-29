import { BadRequestException, Injectable } from "@nestjs/common";
import { OdooConnection } from "@atfm/db";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { assertSocietyMember } from "../../../common/access/assert-society-member";
import { OdooClient } from "../odoo-client";
import { encryptSecret } from "../odoo-crypto.util";
import { UpsertConnectionDto } from "./dto/upsert-connection.dto";

@Injectable()
export class ConnectionService {
  constructor(private readonly prisma: PrismaService) {}

  /// POST /integrations/odoo/connection — appelle réellement `common.authenticate`
  /// sur l'instance Odoo fournie avant de persister quoi que ce soit. En cas
  /// d'échec, la tentative est quand même enregistrée (connected=false,
  /// lastError) pour que l'écran de connexion affiche un diagnostic réel.
  async testAndStore(dto: UpsertConnectionDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    const client = new OdooClient({ url: dto.url, database: dto.database, username: dto.username, apiKey: dto.apiKey });
    const apiKeyEncrypted = encryptSecret(dto.apiKey);

    try {
      await client.authenticate();
    } catch (error) {
      await this.prisma.client.odooConnection.upsert({
        where: { society: dto.society },
        create: {
          society: dto.society,
          url: dto.url,
          database: dto.database,
          username: dto.username,
          apiKeyEncrypted,
          connected: false,
          lastError: (error as Error).message,
        },
        update: {
          url: dto.url,
          database: dto.database,
          username: dto.username,
          apiKeyEncrypted,
          connected: false,
          lastError: (error as Error).message,
        },
      });
      throw new BadRequestException((error as Error).message);
    }

    const connection = await this.prisma.client.odooConnection.upsert({
      where: { society: dto.society },
      create: {
        society: dto.society,
        url: dto.url,
        database: dto.database,
        username: dto.username,
        apiKeyEncrypted,
        connected: true,
        lastConnectedAt: new Date(),
        lastError: null,
      },
      update: {
        url: dto.url,
        database: dto.database,
        username: dto.username,
        apiKeyEncrypted,
        connected: true,
        lastConnectedAt: new Date(),
        lastError: null,
      },
    });

    return this.toStatus(connection);
  }

  async getStatus(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);
    const connection = await this.prisma.client.odooConnection.findUnique({ where: { society } });
    return connection ? this.toStatus(connection) : null;
  }

  /// Jamais `apiKeyEncrypted` au-delà de cette méthode — seul le statut de
  /// connexion est visible côté navigateur (voir section 9 du dossier de
  /// passation : les identifiants ne doivent jamais transiter côté navigateur).
  private toStatus(connection: OdooConnection) {
    return {
      society: connection.society,
      url: connection.url,
      database: connection.database,
      username: connection.username,
      connected: connection.connected,
      lastConnectedAt: connection.lastConnectedAt,
      lastError: connection.lastError,
      selectedModules: connection.selectedModules,
    };
  }
}
