export interface OdooCredentials {
  url: string;
  database: string;
  username: string;
  apiKey: string;
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: { message?: string; name?: string } };
}

/// Client Odoo réel — appelle l'API JSON-RPC standard d'Odoo (endpoint unique
/// `/jsonrpc`, services "common" et "object") via `fetch` natif, sans
/// dépendance tierce. Équivalent JSON-RPC de l'API XML-RPC 2.0 documentée par
/// Odoo (https://www.odoo.com/documentation/latest/developer/reference/external_api.html) —
/// même modèle d'authentification (uid + clé API), mêmes noms de méthodes.
export class OdooClient {
  constructor(private readonly credentials: OdooCredentials) {}

  private async call<T>(service: string, method: string, args: unknown[]): Promise<T> {
    const endpoint = `${this.credentials.url.replace(/\/+$/, "")}/jsonrpc`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: { service, method, args },
          id: Math.floor(Math.random() * 1_000_000_000),
        }),
      });
    } catch (error) {
      throw new Error(`Impossible de joindre l'instance Odoo à "${this.credentials.url}" : ${(error as Error).message}`);
    }

    if (!response.ok) {
      throw new Error(`Odoo a répondu avec le statut HTTP ${response.status}.`);
    }

    const body = (await response.json()) as JsonRpcResponse<T>;
    if (body.error) {
      const message = body.error.data?.message ?? body.error.message ?? "Erreur inconnue renvoyée par Odoo.";
      throw new Error(message);
    }
    return body.result as T;
  }

  /// `common.authenticate` — vérifie les identifiants et renvoie l'uid Odoo de
  /// l'utilisateur, ou lève si la base/l'utilisateur/la clé API est invalide.
  async authenticate(): Promise<number> {
    const uid = await this.call<number | false>("common", "authenticate", [
      this.credentials.database,
      this.credentials.username,
      this.credentials.apiKey,
      {},
    ]);
    if (!uid) {
      throw new Error("Authentification refusée : base de données, utilisateur ou clé API incorrects.");
    }
    return uid;
  }

  /// `object.execute_kw` — point d'entrée générique pour toute opération sur un
  /// modèle Odoo (search_count, search_read, create, write...).
  async executeKw<T>(
    uid: number,
    model: string,
    method: string,
    args: unknown[] = [],
    kwargs: Record<string, unknown> = {},
  ): Promise<T> {
    return this.call<T>("object", "execute_kw", [
      this.credentials.database,
      uid,
      this.credentials.apiKey,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  async searchCount(uid: number, model: string, domain: unknown[] = []): Promise<number> {
    return this.executeKw<number>(uid, model, "search_count", [domain]);
  }

  async searchRead(
    uid: number,
    model: string,
    domain: unknown[],
    fields: string[],
    offset = 0,
    limit = 100,
  ): Promise<Record<string, unknown>[]> {
    return this.executeKw<Record<string, unknown>[]>(uid, model, "search_read", [domain, fields], { offset, limit });
  }
}
