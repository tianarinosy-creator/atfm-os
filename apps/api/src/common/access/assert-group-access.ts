import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedUser } from "../../auth/auth.types";

/// Sociéte holding — les modules à portée Groupe (pas de colonne `society`,
/// contrairement au reste de la plateforme) réservent leur accès aux personnes
/// ayant une affectation active chez elle : Investissements (Phase 3) puis la
/// vue "Comparaison filiales" de la BI (Phase 3), qui lit le Finance de toutes
/// les sociétés à la fois et ne peut donc pas être ouverte à n'importe quel actif.
export const HOLDING_SOCIETY = "atfm";

export function assertGroupAccess(actor: AuthenticatedUser) {
  if (!actor.societies.includes(HOLDING_SOCIETY)) {
    throw new ForbiddenException("Ce module est réservé aux personnes ayant une affectation active chez ATFM Legacy.");
  }
}
