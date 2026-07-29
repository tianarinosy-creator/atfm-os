import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const SALT = "atfm-os-capital-odoo-credentials";

/// Clé de chiffrement des identifiants Odoo (clé API) — dérivée d'un secret
/// d'environnement, jamais codée en dur en production. Voir ODOO_CREDENTIALS_KEY
/// dans .env (même logique que JWT_SECRET : une valeur de dev par défaut, à
/// remplacer impérativement en environnement réel).
function deriveKey(): Buffer {
  const secret = process.env.ODOO_CREDENTIALS_KEY ?? "atfm-dev-odoo-credentials-key-change-me";
  return scryptSync(secret, SALT, 32);
}

/// Chiffre un secret (clé API Odoo) avant écriture en base — la table
/// odoo_connections ne contient jamais la clé en clair.
export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

/// Déchiffre un secret juste avant un appel réel à l'API Odoo — jamais renvoyé
/// tel quel dans une réponse HTTP (voir ConnectionService.getStatus).
export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Payload chiffré invalide.");
  }
  const decipher = createDecipheriv(ALGORITHM, deriveKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
