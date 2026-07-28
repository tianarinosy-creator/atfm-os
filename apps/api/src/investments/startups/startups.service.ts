import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { assertGroupAccess } from "../investments-access.util";
import { QueryStartupsDto } from "./dto/query-startups.dto";
import { CreateStartupDto } from "./dto/create-startup.dto";
import { UpdateStartupDto } from "./dto/update-startup.dto";
import { AddDueDiligenceItemDto } from "./dto/add-due-diligence-item.dto";
import { CreateInvestorDto } from "./dto/create-investor.dto";
import { CreateHistoryEventDto } from "./dto/create-history-event.dto";

const STARTUP_INCLUDE = {
  dueDiligenceItems: { orderBy: { createdAt: "asc" as const } },
  capTable: { orderBy: { createdAt: "asc" as const } },
  investors: { orderBy: { createdAt: "asc" as const } },
  history: { orderBy: { date: "desc" as const } },
};

@Injectable()
export class StartupsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryStartupsDto, actor: AuthenticatedUser) {
    assertGroupAccess(actor);

    const startups = await this.prisma.client.startup.findMany({
      include: STARTUP_INCLUDE,
      orderBy: { createdAt: "desc" },
    });

    const q = query.search?.trim().toLowerCase();
    if (!q) return startups;
    return startups.filter((s) => s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q));
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    assertGroupAccess(actor);

    const startup = await this.prisma.client.startup.findUnique({ where: { id }, include: STARTUP_INCLUDE });
    if (!startup) throw new NotFoundException("Startup introuvable.");
    return startup;
  }

  async create(dto: CreateStartupDto, actor: AuthenticatedUser) {
    assertGroupAccess(actor);

    return this.prisma.client.startup.create({
      data: {
        name: dto.name,
        sector: dto.sector ?? "",
        founder: dto.founder ?? "",
        description: dto.description ?? "",
        round: dto.round,
        amountTarget: dto.amountTarget ?? 0,
      },
      include: STARTUP_INCLUDE,
    });
  }

  async update(id: string, dto: UpdateStartupDto, actor: AuthenticatedUser) {
    assertGroupAccess(actor);
    await this.assertExists(id);

    return this.prisma.client.startup.update({
      where: { id },
      data: {
        name: dto.name,
        sector: dto.sector,
        founder: dto.founder,
        description: dto.description,
        stage: dto.stage,
        pitchNotes: dto.pitchNotes,
        businessPlanNotes: dto.businessPlanNotes,
        dueDiligenceStatus: dto.dueDiligenceStatus,
        round: dto.round,
        amountTarget: dto.amountTarget,
        amountRaised: dto.amountRaised,
        roundStatus: dto.roundStatus,
        valuationPreMoney: dto.valuationPreMoney,
        valuationPostMoney: dto.valuationPostMoney,
        currentValuation: dto.currentValuation,
        atfmInvested: dto.atfmInvested,
        atfmStakePercentage: dto.atfmStakePercentage,
        dateInvested: dto.dateInvested === undefined ? undefined : dto.dateInvested ? new Date(dto.dateInvested) : null,
      },
      include: STARTUP_INCLUDE,
    });
  }

  async toggleDueDiligenceItem(startupId: string, itemId: string, actor: AuthenticatedUser) {
    assertGroupAccess(actor);
    await this.assertExists(startupId);

    const item = await this.prisma.client.startupDueDiligenceItem.findUnique({ where: { id: itemId } });
    if (!item || item.startupId !== startupId) throw new NotFoundException("Point de Due Diligence introuvable pour cette startup.");

    await this.prisma.client.startupDueDiligenceItem.update({ where: { id: itemId }, data: { done: !item.done } });
    return this.findOne(startupId, actor);
  }

  async addDueDiligenceItem(startupId: string, dto: AddDueDiligenceItemDto, actor: AuthenticatedUser) {
    assertGroupAccess(actor);
    await this.assertExists(startupId);

    await this.prisma.client.startupDueDiligenceItem.create({ data: { startupId, text: dto.text, done: false } });
    return this.findOne(startupId, actor);
  }

  async addInvestor(startupId: string, dto: CreateInvestorDto, actor: AuthenticatedUser) {
    assertGroupAccess(actor);
    await this.assertExists(startupId);

    await this.prisma.client.startupInvestor.create({
      data: { startupId, name: dto.name, type: dto.type, contact: dto.contact ?? "" },
    });
    return this.findOne(startupId, actor);
  }

  async addHistoryEvent(startupId: string, dto: CreateHistoryEventDto, actor: AuthenticatedUser) {
    assertGroupAccess(actor);
    await this.assertExists(startupId);

    await this.prisma.client.startupHistoryEvent.create({
      data: { startupId, event: dto.event, description: dto.description ?? "", date: new Date(dto.date) },
    });
    return this.findOne(startupId, actor);
  }

  /// GET /investments/portfolio — startups au stade "investi" + agrégats ROI
  /// (voir InvestissementsMain : totalInvested / totalCurrentValue / globalROI).
  async getPortfolio(actor: AuthenticatedUser) {
    assertGroupAccess(actor);

    const startups = await this.prisma.client.startup.findMany({
      where: { stage: "investi" },
      include: STARTUP_INCLUDE,
      orderBy: { dateInvested: "desc" },
    });

    const items = startups.map((s) => {
      const currentStake = Math.round((s.currentValuation || 0) * ((s.atfmStakePercentage || 0) / 100));
      const roi = s.atfmInvested ? Math.round(((currentStake - s.atfmInvested) / s.atfmInvested) * 100) : 0;
      return { ...s, currentStake, roi };
    });

    const totalInvested = items.reduce((sum, s) => sum + (s.atfmInvested || 0), 0);
    const totalCurrentValue = items.reduce((sum, s) => sum + s.currentStake, 0);
    const globalROI = totalInvested ? Math.round(((totalCurrentValue - totalInvested) / totalInvested) * 100) : 0;

    return { items, totalInvested, totalCurrentValue, globalROI };
  }

  /// GET /investments/investors — co-investisseurs agrégés par nom across
  /// toutes les startups (jamais stocké à part, voir allInvestors du prototype).
  async getInvestors(actor: AuthenticatedUser) {
    assertGroupAccess(actor);

    const startups = await this.prisma.client.startup.findMany({ include: { investors: true } });

    const map = new Map<string, { name: string; type: string; contact: string; startups: string[] }>();
    for (const s of startups) {
      for (const iv of s.investors) {
        if (!map.has(iv.name)) map.set(iv.name, { name: iv.name, type: iv.type, contact: iv.contact, startups: [] });
        map.get(iv.name)!.startups.push(s.name);
      }
    }
    return Array.from(map.values());
  }

  /// GET /investments/history — vue dérivée qui aplatit l'historique de toutes
  /// les startups, triée par date décroissante (voir InvestHistoryView).
  async getHistory(actor: AuthenticatedUser) {
    assertGroupAccess(actor);

    const startups = await this.prisma.client.startup.findMany({ include: { history: true } });

    return startups
      .flatMap((s) => s.history.map((h) => ({ ...h, startupName: s.name, startupId: s.id })))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  private async assertExists(id: string) {
    const existing = await this.prisma.client.startup.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Startup introuvable.");
    return existing;
  }
}
