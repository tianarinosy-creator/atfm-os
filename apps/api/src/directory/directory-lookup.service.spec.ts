import { BadRequestException } from "@nestjs/common";
import { DirectoryLookupService } from "./directory-lookup.service";
import { PeopleService } from "../people/people.service";
import { EmployeeView } from "../people/people.types";

function employee(overrides: Partial<EmployeeView>): EmployeeView {
  return {
    personId: "p1",
    affectationId: "a1",
    name: "Elodie Vasseur",
    email: "elodie@atfm-group.com",
    phone: null,
    society: "logistics",
    department: "Commercial",
    position: "Chargée grands comptes",
    manager: null,
    entryDate: new Date(),
    status: "Actif",
    replacement: null,
    isCommercial: true,
    ...overrides,
  };
}

describe("DirectoryLookupService", () => {
  let peopleService: PeopleService;
  let service: DirectoryLookupService;

  beforeEach(() => {
    peopleService = { findAll: jest.fn() } as unknown as PeopleService;
    service = new DirectoryLookupService(peopleService);
  });

  describe("commerciaux (CRM)", () => {
    it("interroge le Core Directory (department=Commercial) — jamais de copie locale", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([employee({ personId: "p1" })]);

      const map = await service.loadCommercials("logistics");

      expect(peopleService.findAll).toHaveBeenCalledWith({ society: "logistics", department: "Commercial" });
      expect(map.get("p1")).toMatchObject({ personId: "p1" });
    });

    it("autorise l'assignation d'un Commercial actif", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([employee({ personId: "p1", status: "Actif" })]);

      await expect(service.assertActiveCommercial("logistics", "p1")).resolves.toBeUndefined();
    });

    it("refuse l'assignation d'un Commercial Inactif (ex. Elodie, avec relais)", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([
        employee({ personId: "p1", status: "Inactif", replacement: "Sarah Kaced" }),
      ]);

      await expect(service.assertActiveCommercial("logistics", "p1")).rejects.toThrow(BadRequestException);
    });

    it("refuse l'assignation à quelqu'un qui n'est pas Commercial dans cette société", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([]);

      await expect(service.assertActiveCommercial("logistics", "unknown-person")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("membres de société (Projets et modules suivants)", () => {
    it("interroge le Core Directory sans filtre de département", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([employee({ personId: "p1", department: "Ingénierie" })]);

      const map = await service.loadSocietyMembers("tech");

      expect(peopleService.findAll).toHaveBeenCalledWith({ society: "tech" });
      expect(map.get("p1")).toMatchObject({ personId: "p1" });
    });

    it("autorise l'assignation d'une personne active, quel que soit son département", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([
        employee({ personId: "p1", department: "Ingénierie", status: "Actif" }),
      ]);

      await expect(service.assertActiveMember("tech", "p1")).resolves.toBeUndefined();
    });

    it("refuse l'assignation d'une personne Inactive", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([
        employee({ personId: "p1", department: "Ingénierie", status: "Inactif" }),
      ]);

      await expect(service.assertActiveMember("tech", "p1")).rejects.toThrow(BadRequestException);
    });

    it("refuse l'assignation à quelqu'un sans affectation dans cette société", async () => {
      (peopleService.findAll as jest.Mock).mockResolvedValue([]);

      await expect(service.assertActiveMember("tech", "unknown-person")).rejects.toThrow(BadRequestException);
    });
  });
});
