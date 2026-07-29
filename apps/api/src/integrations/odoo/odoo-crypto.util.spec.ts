import { decryptSecret, encryptSecret } from "./odoo-crypto.util";

describe("odoo-crypto.util", () => {
  it("chiffre puis déchiffre un secret à l'identique", () => {
    const payload = encryptSecret("ma-cle-api-odoo-très-secrète");
    expect(payload).not.toContain("ma-cle-api-odoo-très-secrète");
    expect(decryptSecret(payload)).toBe("ma-cle-api-odoo-très-secrète");
  });

  it("produit un IV différent à chaque chiffrement (jamais le même payload deux fois)", () => {
    const a = encryptSecret("meme-secret");
    const b = encryptSecret("meme-secret");
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe("meme-secret");
    expect(decryptSecret(b)).toBe("meme-secret");
  });

  it("échoue si le payload chiffré est altéré (intégrité AES-GCM)", () => {
    const payload = encryptSecret("secret-original");
    const [iv, authTag, data] = payload.split(":");
    const tampered = [iv, authTag, data.slice(0, -2) + "00"].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
