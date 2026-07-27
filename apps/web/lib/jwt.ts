/// Décodage non vérifié du payload JWT, uniquement pour l'affichage (ex. quelles
/// sociétés proposer dans le sélecteur). L'autorisation réelle reste imposée par
/// l'API sur chaque requête — jamais une frontière de sécurité côté frontend.
export function decodeJwtPayload<T = unknown>(token: string): T | null {
  try {
    const payload = token.split(".")[1];
    const json = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}
