import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { assertSocietyMember } from "../../../common/access/assert-society-member";
import { SelectModulesDto } from "./dto/select-modules.dto";

@Injectable()
export class SelectionService {
  constructor(private readonly prisma: PrismaService) {}

  /// PATCH /integrations/odoo/selection — modules Odoo choisis pour la
  /// migration (voir OdooSelectionStep). La correspondance des champs par
  /// défaut est amorcée à la demande par MappingService.getMapping, jamais ici.
  async setSelected(society: string, dto: SelectModulesDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const existing = await this.prisma.client.odooConnection.findUnique({ where: { society } });
    if (!existing) {
      throw new NotFoundException("Connectez-vous d'abord à Odoo pour cette société avant de sélectionner des modules.");
    }

    const updated = await this.prisma.client.odooConnection.update({
      where: { society },
      data: { selectedModules: [...new Set(dto.moduleIds)] },
    });

    return { selectedModules: updated.selectedModules };
  }
}
