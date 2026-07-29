import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { SelectionService } from "./selection.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("SelectionService", () => {
  let prisma: PrismaMock;
  let service: SelectionService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SelectionService(prisma);
  });

  it("refuse un acteur hors société", async () => {
    await expect(service.setSelected("tech", { moduleIds: ["crm"] }, actorOf("logistics"))).rejects.toThrow(ForbiddenException);
  });

  it("exige une connexion Odoo existante avant de sélectionner des modules", async () => {
    (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.setSelected("tech", { moduleIds: ["crm"] }, actorOf("tech"))).rejects.toThrow(NotFoundException);
  });

  it("dédoublonne et persiste les modules sélectionnés", async () => {
    (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({ society: "tech" });
    (prisma.client.odooConnection.update as jest.Mock).mockResolvedValue({ selectedModules: ["crm", "documents"] });

    const result = await service.setSelected("tech", { moduleIds: ["crm", "documents", "crm"] }, actorOf("tech"));

    expect(prisma.client.odooConnection.update).toHaveBeenCalledWith({
      where: { society: "tech" },
      data: { selectedModules: ["crm", "documents"] },
    });
    expect(result.selectedModules).toEqual(["crm", "documents"]);
  });
});
