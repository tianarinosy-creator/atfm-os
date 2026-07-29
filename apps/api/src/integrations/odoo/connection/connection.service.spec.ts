import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConnectionService } from "./connection.service";
import { AuthenticatedUser } from "../../../auth/auth.types";
import { createPrismaMock, PrismaMock } from "../../../test/prisma-mock";

function actorOf(...societies: string[]): AuthenticatedUser {
  return { personId: "actor-1", username: "actor", name: "Actor", roles: [], societies };
}

function mockAuthenticate(outcome: { result?: unknown; error?: { message: string } }) {
  (global as any).fetch = jest.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return { ok: true, json: async () => ({ jsonrpc: "2.0", id: body.id, ...outcome }) };
  });
}

describe("ConnectionService", () => {
  let prisma: PrismaMock;
  let service: ConnectionService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new ConnectionService(prisma);
    (global as any).fetch = jest.fn();
  });

  it("refuse un acteur hors société sans même tenter de joindre Odoo", async () => {
    await expect(
      service.testAndStore(
        { society: "logistics", url: "https://demo.odoo.com", database: "demo", username: "admin", apiKey: "key" },
        actorOf("tech"),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("teste réellement l'authentification Odoo avant de persister quoi que ce soit d'utile", async () => {
    mockAuthenticate({ result: 7 });
    (prisma.client.odooConnection.upsert as jest.Mock).mockResolvedValue({
      society: "tech",
      url: "https://demo.odoo.com",
      database: "demo",
      username: "admin",
      connected: true,
      lastConnectedAt: new Date("2026-01-01"),
      lastError: null,
      selectedModules: [],
    });

    const status = await service.testAndStore(
      { society: "tech", url: "https://demo.odoo.com", database: "demo", username: "admin", apiKey: "super-secret" },
      actorOf("tech"),
    );

    expect(global.fetch).toHaveBeenCalled();
    expect(status).not.toHaveProperty("apiKeyEncrypted");
    expect(status).not.toHaveProperty("apiKey");
    expect(status.connected).toBe(true);

    const upsertArgs = (prisma.client.odooConnection.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertArgs.create.apiKeyEncrypted).not.toContain("super-secret");
    expect(upsertArgs.update.apiKeyEncrypted).not.toContain("super-secret");
  });

  it("enregistre l'échec réel (connected=false, lastError) sans jamais stocker la clé en clair", async () => {
    mockAuthenticate({ result: false });
    (prisma.client.odooConnection.upsert as jest.Mock).mockResolvedValue({});

    await expect(
      service.testAndStore(
        { society: "tech", url: "https://demo.odoo.com", database: "demo", username: "admin", apiKey: "wrong-key" },
        actorOf("tech"),
      ),
    ).rejects.toThrow(BadRequestException);

    const upsertArgs = (prisma.client.odooConnection.upsert as jest.Mock).mock.calls[0][0];
    expect(upsertArgs.create.connected).toBe(false);
    expect(upsertArgs.create.lastError).toMatch(/Authentification refusée/);
    expect(upsertArgs.create.apiKeyEncrypted).not.toContain("wrong-key");
  });

  describe("getStatus", () => {
    it("ne renvoie jamais la clé API chiffrée", async () => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue({
        society: "tech",
        url: "https://demo.odoo.com",
        database: "demo",
        username: "admin",
        apiKeyEncrypted: "iv:tag:cipher",
        connected: true,
        lastConnectedAt: new Date(),
        lastError: null,
        selectedModules: ["crm"],
      });

      const status = await service.getStatus("tech", actorOf("tech"));

      expect(status).not.toHaveProperty("apiKeyEncrypted");
      expect(status?.selectedModules).toEqual(["crm"]);
    });

    it("renvoie null si aucune connexion n'a jamais été configurée", async () => {
      (prisma.client.odooConnection.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getStatus("tech", actorOf("tech"))).resolves.toBeNull();
    });
  });
});
