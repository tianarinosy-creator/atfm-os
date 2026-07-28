import { monthKey, toEUR } from "./finance.constants";

describe("finance.constants", () => {
  describe("toEUR", () => {
    it("laisse l'EUR inchangé", () => {
      expect(toEUR(1000, "EUR")).toBe(1000);
    });

    it("convertit l'USD et le GBP au taux fixe (pas d'appel externe)", () => {
      expect(toEUR(1000, "USD")).toBe(920);
      expect(toEUR(1000, "GBP")).toBe(1170);
    });

    it("gère un montant nul/absent sans planter", () => {
      expect(toEUR(0, "EUR")).toBe(0);
      expect(toEUR(undefined as unknown as number, "EUR")).toBe(0);
    });
  });

  describe("monthKey", () => {
    it("formate AAAA-MM avec le mois sur deux chiffres", () => {
      expect(monthKey(new Date(2026, 0, 15))).toBe("2026-01");
      expect(monthKey(new Date(2026, 10, 3))).toBe("2026-11");
    });
  });
});
