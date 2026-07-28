import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { StartupsService } from "./startups.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("StartupsService", () => {
  let prisma: PrismaMock;
  let service: StartupsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new StartupsService(prisma);
  });

  describe("accès Groupe", () => {
    it("refuse un acteur sans affectation active chez ATFM Legacy (atfm)", async () => {
      await expect(service.findAll({}, actorOf("tech", "logistics"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.startup.findMany).not.toHaveBeenCalled();
    });

    it("autorise un acteur affecté chez atfm, même s'il l'est aussi ailleurs", async () => {
      (prisma.client.startup.findMany as jest.Mock).mockResolvedValue([]);
      await expect(service.findAll({}, actorOf("tech", "atfm"))).resolves.toEqual([]);
    });
  });

  describe("findAll", () => {
    it("filtre par nom ou secteur (insensible à la casse)", async () => {
      (prisma.client.startup.findMany as jest.Mock).mockResolvedValue([
        { id: "1", name: "NovaFret", sector: "Logistique verte" },
        { id: "2", name: "Mira Health", sector: "Impact & Santé" },
      ]);

      const result = await service.findAll({ search: "logistique" }, actorOf("atfm"));

      expect(result).toEqual([{ id: "1", name: "NovaFret", sector: "Logistique verte" }]);
    });
  });

  describe("findOne", () => {
    it("404 si la startup n'existe pas", async () => {
      (prisma.client.startup.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne("missing", actorOf("atfm"))).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("crée une startup au stade sourcing par défaut (délégué au schéma)", async () => {
      (prisma.client.startup.create as jest.Mock).mockResolvedValue({ id: "su1" });

      await service.create(
        { name: "Urbanest", sector: "PropTech", founder: "Lucie Barbier", description: "", round: "Seed", amountTarget: 1_000_000 },
        actorOf("atfm"),
      );

      expect(prisma.client.startup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "Urbanest", round: "Seed", amountTarget: 1_000_000 }),
        }),
      );
    });

    it("refuse la création hors société holding", async () => {
      await expect(service.create({ name: "X", round: "Seed" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.startup.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("404 si la startup n'existe pas", async () => {
      (prisma.client.startup.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.update("missing", { stage: "pitch" }, actorOf("atfm"))).rejects.toThrow(NotFoundException);
    });

    it("permet un changement de stage (drag & drop du pipeline)", async () => {
      (prisma.client.startup.findUnique as jest.Mock).mockResolvedValue({ id: "su1" });
      (prisma.client.startup.update as jest.Mock).mockResolvedValue({ id: "su1", stage: "dd" });

      await service.update("su1", { stage: "dd" }, actorOf("atfm"));

      expect(prisma.client.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "su1" }, data: expect.objectContaining({ stage: "dd" }) }),
      );
    });

    it("convertit dateInvested en Date, ou en null si explicitement effacé", async () => {
      (prisma.client.startup.findUnique as jest.Mock).mockResolvedValue({ id: "su1" });
      (prisma.client.startup.update as jest.Mock).mockResolvedValue({ id: "su1" });

      await service.update("su1", { dateInvested: null }, actorOf("atfm"));

      expect(prisma.client.startup.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dateInvested: null }) }),
      );
    });
  });

  describe("toggleDueDiligenceItem", () => {
    it("404 si le point de DD n'appartient pas à cette startup", async () => {
      (prisma.client.startup.findUnique as jest.Mock).mockResolvedValue({ id: "su1" });
      (prisma.client.startupDueDiligenceItem.findUnique as jest.Mock).mockResolvedValue({ id: "dd1", startupId: "su-other", done: false });

      await expect(service.toggleDueDiligenceItem("su1", "dd1", actorOf("atfm"))).rejects.toThrow(NotFoundException);
      expect(prisma.client.startupDueDiligenceItem.update).not.toHaveBeenCalled();
    });

    it("inverse l'état done", async () => {
      (prisma.client.startup.findUnique as jest.Mock).mockResolvedValue({ id: "su1" });
      (prisma.client.startupDueDiligenceItem.findUnique as jest.Mock).mockResolvedValue({ id: "dd1", startupId: "su1", done: false });
      (prisma.client.startupDueDiligenceItem.update as jest.Mock).mockResolvedValue({});

      await service.toggleDueDiligenceItem("su1", "dd1", actorOf("atfm"));

      expect(prisma.client.startupDueDiligenceItem.update).toHaveBeenCalledWith({ where: { id: "dd1" }, data: { done: true } });
    });
  });

  describe("getPortfolio", () => {
    it("calcule la valeur actuelle, le ROI par startup et les agrégats du portefeuille", async () => {
      (prisma.client.startup.findMany as jest.Mock).mockResolvedValue([
        { id: "su1", currentValuation: 18_000_000, atfmStakePercentage: 10, atfmInvested: 1_200_000 },
        { id: "su2", currentValuation: 6_200_000, atfmStakePercentage: 10, atfmInvested: 500_000 },
      ]);

      const result = await service.getPortfolio(actorOf("atfm"));

      // su1 : stake = 1 800 000, roi = (1 800 000 - 1 200 000) / 1 200 000 = +50%
      expect(result.items[0]).toMatchObject({ currentStake: 1_800_000, roi: 50 });
      // su2 : stake = 620 000, roi = (620 000 - 500 000) / 500 000 = +24%
      expect(result.items[1]).toMatchObject({ currentStake: 620_000, roi: 24 });

      expect(result.totalInvested).toBe(1_700_000);
      expect(result.totalCurrentValue).toBe(2_420_000);
      // globalROI = (2 420 000 - 1 700 000) / 1 700 000 ≈ +42%
      expect(result.globalROI).toBe(42);
    });

    it("ne divise jamais par zéro si aucun investissement", async () => {
      (prisma.client.startup.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getPortfolio(actorOf("atfm"));

      expect(result.totalInvested).toBe(0);
      expect(result.globalROI).toBe(0);
    });

    it("refuse un acteur hors holding", async () => {
      await expect(service.getPortfolio(actorOf("tech"))).rejects.toThrow(ForbiddenException);
    });
  });

  describe("getInvestors", () => {
    it("agrège les co-investisseurs par nom across plusieurs startups", async () => {
      (prisma.client.startup.findMany as jest.Mock).mockResolvedValue([
        { name: "NovaFret", investors: [{ name: "Kima Ventures", type: "VC", contact: "contact@kimaventures.com" }] },
        { name: "Ledgr", investors: [{ name: "Kima Ventures", type: "VC", contact: "contact@kimaventures.com" }] },
        { name: "Mira Health", investors: [{ name: "Impact Partners", type: "Fonds à impact", contact: "invest@impactpartners.fr" }] },
      ]);

      const result = await service.getInvestors(actorOf("atfm"));

      expect(result).toEqual([
        { name: "Kima Ventures", type: "VC", contact: "contact@kimaventures.com", startups: ["NovaFret", "Ledgr"] },
        { name: "Impact Partners", type: "Fonds à impact", contact: "invest@impactpartners.fr", startups: ["Mira Health"] },
      ]);
    });
  });

  describe("getHistory", () => {
    it("aplatit et trie l'historique de toutes les startups par date décroissante", async () => {
      (prisma.client.startup.findMany as jest.Mock).mockResolvedValue([
        {
          id: "su1",
          name: "NovaFret",
          history: [
            { id: "h1", date: new Date("2025-01-01"), event: "Investissement", description: "..." },
            { id: "h2", date: new Date("2025-06-01"), event: "Valorisation", description: "..." },
          ],
        },
        {
          id: "su2",
          name: "Mira Health",
          history: [{ id: "h3", date: new Date("2025-03-01"), event: "Investissement", description: "..." }],
        },
      ]);

      const result = await service.getHistory(actorOf("atfm"));

      expect(result.map((h) => h.id)).toEqual(["h2", "h3", "h1"]);
      expect(result[0]).toMatchObject({ startupName: "NovaFret", startupId: "su1" });
    });
  });
});
