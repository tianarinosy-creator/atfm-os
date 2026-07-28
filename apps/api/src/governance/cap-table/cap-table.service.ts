import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { CreateShareholderDto } from "./dto/create-shareholder.dto";
import { UpdateValuationDto } from "./dto/update-valuation.dto";
import { QueryCapTableDto } from "./dto/query-cap-table.dto";

@Injectable()
export class CapTableService {
  constructor(private readonly prisma: PrismaService) {}

  /// GET /governance/cap-table?society= — équivalent de CapitalView du prototype :
  /// valorisation, % réparti et valeur estimée par actionnaire.
  async getCapTable(query: QueryCapTableDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    const [valuationRow, shareholders] = await Promise.all([
      this.prisma.client.governanceValuation.findUnique({ where: { society: query.society } }),
      this.prisma.client.shareholder.findMany({ where: { society: query.society }, orderBy: { createdAt: "asc" } }),
    ]);

    const valuation = valuationRow?.valuation ?? 0;
    const totalPct = shareholders.reduce((s, sh) => s + sh.percentage, 0);

    return {
      valuation,
      totalPct,
      shareholders: shareholders.map((sh) => ({ ...sh, value: Math.round(valuation * (sh.percentage / 100)) })),
    };
  }

  async setValuation(dto: UpdateValuationDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    return this.prisma.client.governanceValuation.upsert({
      where: { society: dto.society },
      create: { society: dto.society, valuation: dto.valuation },
      update: { valuation: dto.valuation },
    });
  }

  async addShareholder(dto: CreateShareholderDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    return this.prisma.client.shareholder.create({
      data: { society: dto.society, name: dto.name, type: dto.type, percentage: dto.percentage },
    });
  }

  async removeShareholder(id: string, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.shareholder.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Actionnaire introuvable.");
    assertSocietyMember(actor, existing.society);

    await this.prisma.client.shareholder.delete({ where: { id } });
    return { id };
  }
}
