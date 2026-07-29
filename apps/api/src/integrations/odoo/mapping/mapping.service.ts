import { Injectable, NotFoundException } from "@nestjs/common";
import { OdooModuleId } from "@atfm/db";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { assertSocietyMember } from "../../../common/access/assert-society-member";
import { findModuleConfig } from "../odoo.constants";
import { UpdateMappingDto } from "./dto/update-mapping.dto";

@Injectable()
export class MappingService {
  constructor(private readonly prisma: PrismaService) {}

  /// GET /integrations/odoo/mapping?society= — amorce la correspondance par
  /// défaut (voir ODOO_MODULES) pour tout module sélectionné n'en ayant pas
  /// encore, puis renvoie la correspondance groupée par module (voir
  /// OdooMappingStep : uniquement les intitulés, jamais la cible réelle du
  /// champ, fixée côté OdooImportService).
  async getMapping(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const connection = await this.prisma.client.odooConnection.findUnique({ where: { society } });
    if (!connection) throw new NotFoundException("Aucune connexion Odoo configurée pour cette société.");

    for (const moduleId of connection.selectedModules) {
      const count = await this.prisma.client.odooFieldMapping.count({ where: { society, moduleId } });
      if (count === 0) {
        const config = findModuleConfig(moduleId);
        await this.prisma.client.odooFieldMapping.createMany({
          data: config.fields.map((f) => ({ society, moduleId, odooField: f.odoo, atfmLabel: f.atfmLabel })),
        });
      }
    }

    const rows = await this.prisma.client.odooFieldMapping.findMany({
      where: { society },
      orderBy: [{ moduleId: "asc" }, { odooField: "asc" }],
    });

    const grouped: Partial<Record<OdooModuleId, { odooField: string; atfmLabel: string }[]>> = {};
    for (const row of rows) {
      (grouped[row.moduleId] ??= []).push({ odooField: row.odooField, atfmLabel: row.atfmLabel });
    }
    return grouped;
  }

  async updateField(society: string, dto: UpdateMappingDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    await this.prisma.client.odooFieldMapping.updateMany({
      where: { society, moduleId: dto.moduleId, odooField: dto.odooField },
      data: { atfmLabel: dto.atfmLabel },
    });

    return this.getMapping(society, actor);
  }
}
