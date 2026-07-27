import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { DirectoryLookupService } from "../../directory/directory-lookup.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

const COMMERCIAL_ACTIF = {
  personId: "commercial-1",
  name: "Sarah Kaced",
  status: "Actif",
  replacement: null,
};

describe("ContactsService", () => {
  let prisma: PrismaMock;
  let directory: DirectoryLookupService;
  let service: ContactsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    directory = {
      loadCommercials: jest.fn().mockResolvedValue(new Map([["commercial-1", COMMERCIAL_ACTIF]])),
      assertActiveCommercial: jest.fn().mockResolvedValue(undefined),
    } as unknown as DirectoryLookupService;
    service = new ContactsService(prisma, directory);
  });

  describe("findAll", () => {
    it("refuse un acteur sans affectation active dans la société demandée", async () => {
      await expect(service.findAll({ society: "logistics" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.crmContact.findMany).not.toHaveBeenCalled();
    });

    it("résout 'Traité par' depuis le Core Directory (jamais un nom stocké)", async () => {
      (prisma.client.crmContact.findMany as jest.Mock).mockResolvedValue([
        { id: "c1", society: "logistics", name: "Client A", handledById: "commercial-1" },
      ]);

      const result = await service.findAll({ society: "logistics" }, actorOf("logistics"));

      expect(directory.loadCommercials).toHaveBeenCalledWith("logistics");
      expect(result[0].handledBy).toEqual(COMMERCIAL_ACTIF);
    });
  });

  describe("create", () => {
    const dto = { society: "logistics", name: "Nouveau Client" };

    it("refuse un acteur hors société", async () => {
      await expect(service.create(dto, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.crmContact.create).not.toHaveBeenCalled();
    });

    it("refuse d'assigner un Commercial invalide/inactif (propage l'erreur du Core Directory)", async () => {
      (directory.assertActiveCommercial as jest.Mock).mockRejectedValue(
        new BadRequestException("La personne assignée doit être un Commercial actif"),
      );

      await expect(
        service.create({ ...dto, handledByPersonId: "someone-inactive" }, actorOf("logistics")),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.client.crmContact.create).not.toHaveBeenCalled();
    });

    it("crée le contact avec le person_id fourni, sans dupliquer le nom", async () => {
      (prisma.client.crmContact.create as jest.Mock).mockResolvedValue({
        id: "new-contact",
        society: "logistics",
        handledById: "commercial-1",
      });

      const result = await service.create({ ...dto, handledByPersonId: "commercial-1" }, actorOf("logistics"));

      expect(directory.assertActiveCommercial).toHaveBeenCalledWith("logistics", "commercial-1");
      expect(prisma.client.crmContact.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ handledById: "commercial-1" }) }),
      );
      expect(result.handledBy).toEqual(COMMERCIAL_ACTIF);
    });
  });

  describe("update", () => {
    it("404 si le contact n'existe pas", async () => {
      (prisma.client.crmContact.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("missing", {}, actorOf("logistics"))).rejects.toThrow(NotFoundException);
    });

    it("403 si l'acteur n'a pas d'affectation active dans la société du contact", async () => {
      (prisma.client.crmContact.findUnique as jest.Mock).mockResolvedValue({ id: "c1", society: "logistics" });

      await expect(service.update("c1", {}, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.crmContact.update).not.toHaveBeenCalled();
    });

    it("permet d'effacer 'Traité par' (handledByPersonId: null) sans revalider le Core Directory", async () => {
      (prisma.client.crmContact.findUnique as jest.Mock).mockResolvedValue({ id: "c1", society: "logistics" });
      (prisma.client.crmContact.update as jest.Mock).mockResolvedValue({ id: "c1", society: "logistics", handledById: null });

      await service.update("c1", { handledByPersonId: null }, actorOf("logistics"));

      expect(directory.assertActiveCommercial).not.toHaveBeenCalled();
      expect(prisma.client.crmContact.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ handledById: null }) }),
      );
    });
  });
});
