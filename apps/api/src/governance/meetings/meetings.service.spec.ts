import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { MeetingsService } from "./meetings.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("MeetingsService", () => {
  let prisma: PrismaMock;
  let service: MeetingsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new MeetingsService(prisma);
  });

  describe("create", () => {
    it("refuse un acteur hors société", async () => {
      await expect(
        service.create({ society: "logistics", type: "ca" as any, title: "CA", date: "2026-01-01", agenda: ["Point 1"] }, actorOf("tech")),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.client.governanceMeeting.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("404 si la réunion n'existe pas", async () => {
      (prisma.client.governanceMeeting.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("missing", {}, actorOf("logistics"))).rejects.toThrow(NotFoundException);
    });

    it("403 si l'acteur n'a pas d'affectation active dans la société de la réunion", async () => {
      (prisma.client.governanceMeeting.findUnique as jest.Mock).mockResolvedValue({ id: "m1", society: "logistics" });

      await expect(service.update("m1", { status: "Tenue" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.governanceMeeting.update).not.toHaveBeenCalled();
    });
  });

  describe("addResolution", () => {
    it("404 si la réunion n'existe pas", async () => {
      (prisma.client.governanceMeeting.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.addResolution("missing", { text: "Nouvelle résolution" }, actorOf("logistics"))).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.client.governanceResolution.create).not.toHaveBeenCalled();
    });

    it("crée la résolution avec le statut 'En délibération' par défaut", async () => {
      (prisma.client.governanceMeeting.findUnique as jest.Mock).mockResolvedValue({ id: "m1", society: "logistics", resolutions: [] });

      await service.addResolution("m1", { text: "Nouvelle résolution" }, actorOf("logistics"));

      expect(prisma.client.governanceResolution.create).toHaveBeenCalledWith({
        data: { meetingId: "m1", text: "Nouvelle résolution", status: "En délibération" },
      });
    });
  });

  describe("updateResolution", () => {
    it("404 si la résolution n'appartient pas à cette réunion", async () => {
      (prisma.client.governanceMeeting.findUnique as jest.Mock).mockResolvedValue({ id: "m1", society: "logistics" });
      (prisma.client.governanceResolution.findUnique as jest.Mock).mockResolvedValue({ id: "r1", meetingId: "autre-reunion" });

      await expect(service.updateResolution("m1", "r1", { status: "Adoptée" }, actorOf("logistics"))).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.client.governanceResolution.update).not.toHaveBeenCalled();
    });

    it("met à jour les votes et le statut", async () => {
      (prisma.client.governanceMeeting.findUnique as jest.Mock).mockResolvedValue({ id: "m1", society: "logistics", resolutions: [] });
      (prisma.client.governanceResolution.findUnique as jest.Mock).mockResolvedValue({ id: "r1", meetingId: "m1" });

      await service.updateResolution("m1", "r1", { votesFor: 5, votesAgainst: 1, status: "Adoptée" }, actorOf("logistics"));

      expect(prisma.client.governanceResolution.update).toHaveBeenCalledWith({
        where: { id: "r1" },
        data: { votesFor: 5, votesAgainst: 1, votesAbstain: undefined, status: "Adoptée" },
      });
    });
  });

  describe("findDecisions", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.findDecisions("logistics", actorOf("tech"))).rejects.toThrow(ForbiddenException);
    });

    it("aplatit les résolutions de toutes les réunions, triées par date décroissante", async () => {
      (prisma.client.governanceMeeting.findMany as jest.Mock).mockResolvedValue([
        {
          id: "m1",
          title: "CA ancien",
          date: new Date(2026, 0, 1),
          resolutions: [{ id: "r1", text: "Ancienne décision" }],
        },
        {
          id: "m2",
          title: "AG récente",
          date: new Date(2026, 5, 1),
          resolutions: [{ id: "r2", text: "Décision récente" }],
        },
      ]);

      const result = await service.findDecisions("logistics", actorOf("logistics"));

      expect(result.map((r) => r.id)).toEqual(["r2", "r1"]);
      expect(result[0]).toMatchObject({ meetingId: "m2", meetingTitle: "AG récente" });
    });
  });
});
