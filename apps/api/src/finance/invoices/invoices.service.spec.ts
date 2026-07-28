import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";
import { AuthenticatedUser } from "../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

describe("InvoicesService", () => {
  let prisma: PrismaMock;
  let service: InvoicesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new InvoicesService(prisma);
  });

  describe("findAll", () => {
    it("refuse un acteur hors société", async () => {
      await expect(service.findAll({ society: "logistics" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.financeInvoice.findMany).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    const dto = { society: "logistics", client: "Transalliance", amount: 15000, currency: "EUR" as const, dueDate: "2026-09-01" };

    it("refuse un acteur hors société", async () => {
      await expect(service.create(dto, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.financeInvoice.create).not.toHaveBeenCalled();
    });

    it("crée la facture avec le statut 'En attente' par défaut", async () => {
      (prisma.client.financeInvoice.create as jest.Mock).mockResolvedValue({ id: "inv-1" });

      await service.create(dto, actorOf("logistics"));

      expect(prisma.client.financeInvoice.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: "En attente", category: "Vente de services" }) }),
      );
    });
  });

  describe("update", () => {
    it("404 si la facture n'existe pas", async () => {
      (prisma.client.financeInvoice.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.update("missing", {}, actorOf("logistics"))).rejects.toThrow(NotFoundException);
    });

    it("permet de marquer une facture payée", async () => {
      (prisma.client.financeInvoice.findUnique as jest.Mock).mockResolvedValue({ id: "inv-1", society: "logistics" });
      (prisma.client.financeInvoice.update as jest.Mock).mockResolvedValue({ id: "inv-1", status: "Payée" });

      await service.update("inv-1", { status: "Payée" }, actorOf("logistics"));

      expect(prisma.client.financeInvoice.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "inv-1" }, data: expect.objectContaining({ status: "Payée" }) }),
      );
    });

    it("403 si l'acteur n'a pas d'affectation active dans la société de la facture", async () => {
      (prisma.client.financeInvoice.findUnique as jest.Mock).mockResolvedValue({ id: "inv-1", society: "logistics" });

      await expect(service.update("inv-1", { status: "Payée" }, actorOf("tech"))).rejects.toThrow(ForbiddenException);
      expect(prisma.client.financeInvoice.update).not.toHaveBeenCalled();
    });
  });
});
