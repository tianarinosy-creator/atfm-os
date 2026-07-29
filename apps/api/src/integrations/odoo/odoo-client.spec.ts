import { OdooClient } from "./odoo-client";

function mockFetchOnce(handler: (body: any) => { result?: unknown; error?: { message: string } } | null, ok = true, status = 200) {
  (global.fetch as jest.Mock).mockImplementationOnce(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    const outcome = handler(body);
    return {
      ok,
      status,
      json: async () => ({ jsonrpc: "2.0", id: body.id, ...outcome }),
    };
  });
}

describe("OdooClient", () => {
  const credentials = { url: "https://demo.odoo.com", database: "demo", username: "admin", apiKey: "secret-key" };

  beforeEach(() => {
    (global as any).fetch = jest.fn();
  });

  describe("authenticate", () => {
    it("renvoie l'uid en cas de succès et appelle le bon endpoint/service/méthode", async () => {
      mockFetchOnce((body) => {
        expect(body.params.service).toBe("common");
        expect(body.params.method).toBe("authenticate");
        expect(body.params.args).toEqual(["demo", "admin", "secret-key", {}]);
        return { result: 7 };
      });

      const client = new OdooClient(credentials);
      const uid = await client.authenticate();

      expect(uid).toBe(7);
      expect(global.fetch).toHaveBeenCalledWith("https://demo.odoo.com/jsonrpc", expect.objectContaining({ method: "POST" }));
    });

    it("lève une erreur explicite si Odoo renvoie uid=false (identifiants invalides)", async () => {
      mockFetchOnce(() => ({ result: false }));

      const client = new OdooClient(credentials);
      await expect(client.authenticate()).rejects.toThrow(/Authentification refusée/);
    });

    it("propage le message d'erreur JSON-RPC renvoyé par Odoo", async () => {
      mockFetchOnce(() => ({ error: { message: "Base de données inconnue" } }));

      const client = new OdooClient(credentials);
      await expect(client.authenticate()).rejects.toThrow("Base de données inconnue");
    });

    it("lève une erreur si le statut HTTP n'est pas ok", async () => {
      mockFetchOnce(() => ({ result: 1 }), false, 503);

      const client = new OdooClient(credentials);
      await expect(client.authenticate()).rejects.toThrow(/503/);
    });

    it("enveloppe une erreur réseau (fetch qui rejette)", async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const client = new OdooClient(credentials);
      await expect(client.authenticate()).rejects.toThrow(/Impossible de joindre l'instance Odoo/);
    });
  });

  describe("executeKw / searchCount / searchRead", () => {
    it("transmet database/uid/apiKey/model/method/args/kwargs à execute_kw", async () => {
      mockFetchOnce((body) => {
        expect(body.params.service).toBe("object");
        expect(body.params.method).toBe("execute_kw");
        expect(body.params.args).toEqual(["demo", 7, "secret-key", "crm.lead", "search_count", [[]], {}]);
        return { result: 42 };
      });

      const client = new OdooClient(credentials);
      const count = await client.searchCount(7, "crm.lead", []);

      expect(count).toBe(42);
    });

    it("searchRead applique offset/limit par défaut et renvoie les enregistrements", async () => {
      mockFetchOnce((body) => {
        const [, , , , , , kwargs] = body.params.args;
        expect(kwargs).toEqual({ offset: 0, limit: 100 });
        return { result: [{ id: 1, name: "Lead A" }] };
      });

      const client = new OdooClient(credentials);
      const records = await client.searchRead(7, "crm.lead", [], ["name"]);

      expect(records).toEqual([{ id: 1, name: "Lead A" }]);
    });
  });
});
