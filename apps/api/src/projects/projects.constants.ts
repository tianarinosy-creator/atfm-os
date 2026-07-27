// Valeurs libres (accentuées) reprises du prototype — voir schema.prisma pour
// l'explication du choix de String plutôt qu'un enum Prisma.
export const RISK_LEVELS = ["Faible", "Modéré", "Élevé", "Critique"] as const;
export const RISK_STATUSES = ["Ouvert", "Clôturé"] as const;
