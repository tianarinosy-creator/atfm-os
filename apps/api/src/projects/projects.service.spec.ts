import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@atfm/db";
import { ProjectsService } from "./projects.service";
import { DirectoryLookupService } from "../directory/directory-lookup.service";
import { AuthenticatedUser } from "../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

const MEMBER = { personId: "person-1", name: "Léa Fontaine", status: "Actif" };

describe("ProjectsService", () => {
  let prisma: PrismaMock;
  let directory: DirectoryLookupService;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    directory = {
      loadSocietyMembers: jest.fn().mockResolvedValue(new Map([["person-1", MEMBER]])),
      assertActiveMember: jest.fn().mockResolvedValue(undefined),
    } as unknown as DirectoryLookupService;
    service = new ProjectsService(prisma, directory);
  });

  describe("findAll", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.findAll({ society: "tech" }, actorOf("logistics"))).rejects.toThrow(ForbiddenException);
    });

    it("calcule la progression, le budget consommé et l'alerte de risque élevé", async () => {
      (prisma.client.project.findMany as jest.Mock).mockResolvedValue([
        {
          id: "p1",
          society: "tech",
          budget: 40000,
          tasks: [{ column: "done" }, { column: "done" }, { column: "todo" }, { column: "inprogress" }],
          expenses: [{ amount: 5000 }, { amount: 2000 }],
          risks: [{ level: "Critique", status: "Ouvert" }],
        },
        {
          id: "p2",
          society: "tech",
          budget: 10000,
          tasks: [],
          expenses: [],
          risks: [{ level: "Critique", status: "Clôturé" }],
        },
      ]);

      const result = await service.findAll({ society: "tech" }, actorOf("tech"));

      expect(result[0]).toMatchObject({ id: "p1", progress: 50, spent: 7000, hasOpenHighRisk: true });
      expect(result[1]).toMatchObject({ id: "p2", progress: 0, spent: 0, hasOpenHighRisk: false });
      // Les champs bruts tasks/expenses/risks ne doivent pas fuiter dans la vue carte.
      expect(result[0]).not.toHaveProperty("tasks");
    });
  });

  describe("create", () => {
    const dto = { society: "tech", name: "Nouveau projet", startDate: "2026-01-01", endDate: "2026-06-01" };

    it("refuse un acteur hors société", async () => {
      await expect(service.create(dto, actorOf("logistics"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.project.create).not.toHaveBeenCalled();
    });

    it("valide chaque membre auprès du Core Directory avant création", async () => {
      (prisma.client.project.create as jest.Mock).mockResolvedValue({
        id: "new-project",
        society: "tech",
        members: [{ personId: "person-1" }],
        tasks: [],
        expenses: [],
        risks: [],
      });

      await service.create({ ...dto, memberIds: ["person-1", "person-1"] }, actorOf("tech"));

      // memberIds dédupliqués : une seule vérification malgré le doublon fourni.
      expect(directory.assertActiveMember).toHaveBeenCalledTimes(1);
      expect(directory.assertActiveMember).toHaveBeenCalledWith("tech", "person-1");
      expect(prisma.client.project.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ members: { create: [{ personId: "person-1" }] } }),
        }),
      );
    });
  });

  describe("update", () => {
    it("404 si le projet n'existe pas", async () => {
      (prisma.client.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("missing", {}, actorOf("tech"))).rejects.toThrow(NotFoundException);
    });

    it("403 si l'acteur n'a pas d'affectation active dans la société du projet", async () => {
      (prisma.client.project.findUnique as jest.Mock).mockResolvedValue({ id: "p1", society: "tech" });

      await expect(service.update("p1", {}, actorOf("logistics"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.project.update).not.toHaveBeenCalled();
    });
  });

  describe("addMember", () => {
    it("refuse une personne sans affectation active dans la société (propage l'erreur)", async () => {
      (prisma.client.project.findUnique as jest.Mock).mockResolvedValue({ id: "p1", society: "tech" });
      (directory.assertActiveMember as jest.Mock).mockRejectedValue(new Error("inactive"));

      await expect(service.addMember("p1", { personId: "person-2" }, actorOf("tech"))).rejects.toThrow("inactive");
      expect(prisma.client.projectMember.create).not.toHaveBeenCalled();
    });

    it("refuse un doublon (déjà membre) en ConflictException", async () => {
      (prisma.client.project.findUnique as jest.Mock).mockResolvedValue({ id: "p1", society: "tech" });
      (prisma.client.projectMember.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.22.0" }),
      );

      await expect(service.addMember("p1", { personId: "person-1" }, actorOf("tech"))).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("addRisk / updateRiskStatus", () => {
    it("crée un risque avec le statut Ouvert par défaut", async () => {
      (prisma.client.project.findUnique as jest.Mock).mockResolvedValue({
        id: "p1",
        society: "tech",
        members: [],
        tasks: [],
        expenses: [],
        risks: [],
      });

      await service.addRisk("p1", { text: "Dépendance clé", level: "Modéré" }, actorOf("tech"));

      expect(prisma.client.projectRisk.create).toHaveBeenCalledWith({
        data: { projectId: "p1", text: "Dépendance clé", level: "Modéré", mitigation: undefined, status: "Ouvert" },
      });
    });

    it("404 si le risque n'appartient pas à ce projet", async () => {
      (prisma.client.project.findUnique as jest.Mock).mockResolvedValue({ id: "p1", society: "tech" });
      (prisma.client.projectRisk.findUnique as jest.Mock).mockResolvedValue({ id: "r1", projectId: "autre-projet" });

      await expect(service.updateRiskStatus("p1", "r1", { status: "Clôturé" }, actorOf("tech"))).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
