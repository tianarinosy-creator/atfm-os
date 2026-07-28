// Reprend les constantes du module Finance du prototype (seedFinanceForTenant,
// toEUR, monthKey) — taux de change fixes, pas d'appel à une API de cours réels.

export const CURRENCIES = ["EUR", "USD", "GBP"] as const;

export const FX_TO_EUR: Record<string, number> = { EUR: 1, USD: 0.92, GBP: 1.17 };

export const EXPENSE_CATEGORIES = [
  "Personnel",
  "Prestation",
  "Loyer",
  "Outils & Licences",
  "Marketing",
  "Déplacement",
  "Autre",
] as const;

export const INVOICE_STATUSES = ["En attente", "Payée", "En retard"] as const;
export const EXPENSE_STATUSES = ["Payée", "En attente"] as const;
export const BUDGET_PERIODS = ["Mensuel", "Trimestriel", "Annuel"] as const;

export function toEUR(amount: number, currency: string): number {
  return Math.round((amount || 0) * (FX_TO_EUR[currency] ?? 1));
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
