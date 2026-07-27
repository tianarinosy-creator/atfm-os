import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertSocietyMember } from "../../common/access/assert-society-member";
import { DirectoryLookupService } from "../../directory/directory-lookup.service";
import { CreateDealDto } from "./dto/create-deal.dto";
import { UpdateDealDto } from "./dto/update-deal.dto";
import { QueryDealsDto } from "./dto/query-deals.dto";
import { CreateActivityDto } from "./dto/create-activity.dto";

const SIGNED_STAGES = ["negociation", "gagne"] as const;

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly directory: DirectoryLookupService,
  ) {}

  private async withOwner<T extends { ownerPersonId: string | null }>(society: string, deals: T[]) {
    const commercials = await this.directory.loadCommercials(society);
    return deals.map((d) => ({
      ...d,
      owner: d.ownerPersonId ? (commercials.get(d.ownerPersonId) ?? null) : null,
    }));
  }

  /// GET /crm/deals?society=&stage= — le pipeline. "Commercial en charge" est
  /// résolu depuis le Core Directory, jamais stocké en dur dans le CRM.
  async findAll(query: QueryDealsDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, query.society);

    const deals = await this.prisma.client.crmDeal.findMany({
      where: { society: query.society, ...(query.stage ? { stage: query.stage } : {}) },
      include: { contact: true, activities: { orderBy: { date: "desc" } } },
      orderBy: { createdAt: "desc" },
    });

    return this.withOwner(query.society, deals);
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const deal = await this.prisma.client.crmDeal.findUnique({
      where: { id },
      include: { contact: true, activities: { orderBy: { date: "desc" } } },
    });
    if (!deal) throw new NotFoundException("Affaire introuvable.");
    assertSocietyMember(actor, deal.society);

    const [withOwner] = await this.withOwner(deal.society, [deal]);
    return withOwner;
  }

  /// GET /crm/contracts?society= — dérivé du pipeline (jamais une table à part) :
  /// une affaire en négociation ou gagnée devient un "contrat", signé dès qu'elle
  /// passe à Gagné (voir ContractsView du prototype).
  async findContracts(society: string, actor: AuthenticatedUser) {
    assertSocietyMember(actor, society);

    const deals = await this.prisma.client.crmDeal.findMany({
      where: { society, stage: { in: [...SIGNED_STAGES] } },
      include: { contact: true },
      orderBy: { createdAt: "desc" },
    });

    const withOwner = await this.withOwner(society, deals);
    return withOwner.map((d) => ({ ...d, signed: d.stage === "gagne" }));
  }

  async create(dto: CreateDealDto, actor: AuthenticatedUser) {
    assertSocietyMember(actor, dto.society);

    const contact = await this.prisma.client.crmContact.findUnique({ where: { id: dto.contactId } });
    if (!contact || contact.society !== dto.society) {
      throw new NotFoundException("Contact introuvable pour cette société.");
    }

    if (dto.ownerPersonId) {
      await this.directory.assertActiveCommercial(dto.society, dto.ownerPersonId);
    }

    const deal = await this.prisma.client.crmDeal.create({
      data: {
        society: dto.society,
        contactId: dto.contactId,
        title: dto.title,
        value: dto.value ?? 0,
        ownerPersonId: dto.ownerPersonId,
        nextActionDate: dto.nextActionDate ? new Date(dto.nextActionDate) : null,
      },
    });

    const [withOwner] = await this.withOwner(dto.society, [deal]);
    return withOwner;
  }

  async update(id: string, dto: UpdateDealDto, actor: AuthenticatedUser) {
    const existing = await this.prisma.client.crmDeal.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Affaire introuvable.");
    assertSocietyMember(actor, existing.society);

    if (dto.ownerPersonId) {
      await this.directory.assertActiveCommercial(existing.society, dto.ownerPersonId);
    }

    const updated = await this.prisma.client.crmDeal.update({
      where: { id },
      data: {
        title: dto.title,
        value: dto.value,
        stage: dto.stage,
        ownerPersonId: dto.ownerPersonId,
        nextActionDate:
          dto.nextActionDate === undefined ? undefined : dto.nextActionDate ? new Date(dto.nextActionDate) : null,
      },
    });

    const [withOwner] = await this.withOwner(existing.society, [updated]);
    return withOwner;
  }

  async addActivity(dealId: string, dto: CreateActivityDto, actor: AuthenticatedUser) {
    const deal = await this.prisma.client.crmDeal.findUnique({ where: { id: dealId } });
    if (!deal) throw new NotFoundException("Affaire introuvable.");
    assertSocietyMember(actor, deal.society);

    return this.prisma.client.crmActivity.create({
      data: { dealId, type: dto.type, text: dto.text },
    });
  }
}
