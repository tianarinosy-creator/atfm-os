import { BadRequestException } from "@nestjs/common";
import { ImportService } from "./import.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../../test/prisma-mock";
import { IMPORT_PAGE_SIZE } from "../odoo.constants";
import { encryptSecret } from "../odoo-crypto.util";

function actorOf(societies: string[], roles: { society: string; role: string }[] = []): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles, societies };
}

/// Simule l'API JSON-RPC d'Odoo : authenticate renvoie toujours l'uid 7,
/// search_count/search_read sont routés par modèle via `perModel`.
function mockOdoo(perModel: Record<string, { count: number; records: Record<string, unknown>[] }>) {
  (global as any).fetch = jest.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const { service, method, args } = body.params;
    let result: unknown;
    if (service === "common" && method === "authenticate") {
      result = 7;
    } else if (service === "object" && method === "execute_kw") {
      const [, , , model, kwMethod] = args;
      const data = perModel[model] ?? { count: 0, records: [] };
      result = kwMethod === "search_count" ? data.count : data.records;
    }
    return { ok: true, json: async () => ({ jsonrpc: "2.0", id: body.id, result }) };
  });
}

describe("ImportService", () => {
  let prisma: PrismaMock;
  let peopleService: { create: jest.Mock };
  let contactsService: { create: jest.Mock };
  let dealsService: { create: jest.Mock; update: jest.Mock };
  let invoicesService: { create: jest.Mock; update: jest.Mock };
  let projectsService: { create: jest.Mock };
  let documentsService: { create: jest.Mock };
  let service: ImportService;

  beforeEach(() => {
    prisma = createPrismaMock();
    peopleService = { create: jest.fn().mockResolvedValue({ person: { id: "person-new" } }) };
    contactsService = { create: jest.fn().mockResolvedValue({ id: "contact-1" }) };
    dealsService = { create: jest.fn().mockResolvedValue({ id: "deal-1" }), update: jest.fn().mockResolvedValue({}) };
    invoicesService = { create: jest.fn().mockResolvedValue({ id: "invoice-1" }), update: jest.fn().mockResolvedValue({}) };
    projectsService = { create: jest.fn().mockResolvedValue({ id: "project-1" }) };
    documentsService = { create: jest.fn().mockResolvedValue({ id: "doc-1" }) };
    (prisma.client.odooMigrationReport.create as jest.Mock).mockImplementation(({ data }) => Promise.resolve(data));

    service = new ImportService(
      prisma,
      peopleService as any,
      contactsService as any,
      dealsService as any,
      invoicesService as any,
      projectsService as any,
      documentsService as any,
    );
  });

  it("refuse si aucune connexion Odoo active pour la société", async () => {
    (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(service.runImport("tech", actorOf(["tech"]))).rejects.toThrow(BadRequestException);
  });

  it("refuse si aucun module n'est sélectionné", async () => {
    (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({ connected: true, selectedModules: [] });
    await expect(service.runImport("tech", actorOf(["tech"]))).rejects.toThrow(BadRequestException);
  });

  describe("module crm", () => {
    beforeEach(() => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({
        connected: true,
        selectedModules: ["crm"],
        url: "https://demo.odoo.com",
        database: "demo",
        username: "admin",
        apiKeyEncrypted: encryptSecret("secret"),
      });
    });

    it("importe réellement chaque lead Odoo en contact + affaire CRM", async () => {
      mockOdoo({
        "crm.lead": {
          count: 2,
          records: [
            { id: 101, name: "Refonte site", partner_name: "Acme SA", email_from: "contact@acme.fr", phone: "0102", expected_revenue: 15000, stage_id: [3, "Proposition envoyée"] },
            { id: 102, name: "Audit sécurité", partner_name: "Beta SAS", email_from: "bad-email", expected_revenue: 8000, stage_id: [5, "Gagné"] },
          ],
        },
      });

      const [report] = await service.runImport("tech", actorOf(["tech"]));

      expect(contactsService.create).toHaveBeenCalledTimes(2);
      expect(contactsService.create.mock.calls[0][0]).toMatchObject({ society: "tech", name: "Acme SA", email: "contact@acme.fr" });
      // email invalide -> jamais transmis tel quel
      expect(contactsService.create.mock.calls[1][0].email).toBeUndefined();

      expect(dealsService.create).toHaveBeenCalledTimes(2);
      expect(dealsService.create.mock.calls[0][0]).toMatchObject({ title: "Refonte site", value: 15000 });

      // stage_id "Proposition envoyée" -> proposition ; "Gagné" -> gagne
      expect(dealsService.update).toHaveBeenCalledWith("deal-1", { stage: "proposition" }, expect.anything());
      expect(dealsService.update).toHaveBeenCalledWith("deal-1", { stage: "gagne" }, expect.anything());

      expect(report).toMatchObject({ moduleId: "crm", available: 2, imported: 2, truncated: false, errors: [] });
      expect(prisma.client.odooMigrationReport.create).toHaveBeenCalled();
    });

    it("consigne l'erreur réelle d'un enregistrement en échec sans bloquer les suivants", async () => {
      mockOdoo({
        "crm.lead": {
          count: 2,
          records: [
            { id: 201, name: "Lead 1", expected_revenue: 1000 },
            { id: 202, name: "Lead 2", expected_revenue: 2000 },
          ],
        },
      });
      contactsService.create.mockRejectedValueOnce(new Error("Contact refusé"));

      const [report] = await service.runImport("tech", actorOf(["tech"]));

      expect(report.imported).toBe(1);
      expect(report.errors).toEqual(["Enregistrement Odoo #201 : Contact refusé"]);
    });

    it("signale une troncature si Odoo contient plus d'enregistrements que le plafond d'import", async () => {
      const records = Array.from({ length: IMPORT_PAGE_SIZE }, (_, i) => ({ id: i, name: `Lead ${i}`, expected_revenue: 100 }));
      mockOdoo({ "crm.lead": { count: IMPORT_PAGE_SIZE + 50, records } });

      const [report] = await service.runImport("tech", actorOf(["tech"]));

      expect(report.available).toBe(IMPORT_PAGE_SIZE + 50);
      expect(report.imported).toBe(IMPORT_PAGE_SIZE);
      expect(report.truncated).toBe(true);
    });
  });

  describe("module rh", () => {
    beforeEach(() => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({
        connected: true,
        selectedModules: ["rh"],
        url: "https://demo.odoo.com",
        database: "demo",
        username: "admin",
        apiKeyEncrypted: encryptSecret("secret"),
      });
    });

    it("refuse d'importer des employés si l'acteur n'a pas le rôle RH de cette société (sans même appeler Odoo)", async () => {
      const [report] = await service.runImport("tech", actorOf(["tech"]));

      expect(peopleService.create).not.toHaveBeenCalled();
      expect(report).toMatchObject({ available: 0, imported: 0 });
      expect(report.errors[0]).toMatch(/Seul le RH/);
    });

    it("crée réellement les personnes via PeopleService quand l'acteur est RH", async () => {
      mockOdoo({
        "hr.employee": {
          count: 1,
          records: [{ id: 55, name: "Julie Martin", work_email: "julie.martin@entreprise.com", job_title: "Comptable", department_id: [2, "Finance"], parent_id: false }],
        },
      });

      const [report] = await service.runImport("tech", actorOf(["tech"], [{ society: "tech", role: "RH" }]));

      expect(peopleService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "Julie",
          lastName: "Martin",
          email: "julie.martin@entreprise.com",
          society: "tech",
          department: "Finance",
          position: "Comptable",
        }),
        expect.anything(),
      );
      expect(report.imported).toBe(1);
    });
  });

  describe("module facturation", () => {
    beforeEach(() => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({
        connected: true,
        selectedModules: ["facturation"],
        url: "https://demo.odoo.com",
        database: "demo",
        username: "admin",
        apiKeyEncrypted: encryptSecret("secret"),
      });
    });

    it("importe les factures clients et bascule le statut payé", async () => {
      mockOdoo({
        "account.move": {
          count: 1,
          records: [{ id: 9, partner_id: [4, "Client Odoo"], amount_total: 2400, currency_id: [1, "EUR"], invoice_date_due: "2026-01-15", payment_state: "paid" }],
        },
      });

      await service.runImport("tech", actorOf(["tech"]));

      expect(invoicesService.create).toHaveBeenCalledWith(
        expect.objectContaining({ society: "tech", client: "Client Odoo", amount: 2400, currency: "EUR" }),
        expect.anything(),
      );
      expect(invoicesService.update).toHaveBeenCalledWith("invoice-1", { status: "Payée" }, expect.anything());
    });
  });

  describe("module documents", () => {
    beforeEach(() => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({
        connected: true,
        selectedModules: ["documents"],
        url: "https://demo.odoo.com",
        database: "demo",
        username: "admin",
        apiKeyEncrypted: encryptSecret("secret"),
      });
    });

    it("rattache le document importé à la personne qui exécute l'import (pas de correspondance Odoo fiable)", async () => {
      mockOdoo({
        "documents.document": {
          count: 1,
          records: [{ id: 3, name: "Contrat cadre", folder_id: [1, "Contrats"], owner_id: [9, "Admin Odoo"], create_date: "2026-02-01" }],
        },
      });

      await service.runImport("tech", actorOf(["tech"]));

      expect(documentsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ ownerPersonId: "actor-1", category: "Contrats" }),
        expect.anything(),
      );
    });
  });
});
