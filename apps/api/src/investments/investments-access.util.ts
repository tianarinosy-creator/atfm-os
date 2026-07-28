import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { HOLDING_SOCIETY } from "./investments.constants";

/// Le module Investissements est à portée Groupe (pas de colonne `society`) :
/// il n'y a donc rien à comparer à un `query.society` comme assertSocietyMember.
/// L'accès est réservé aux personnes ayant une affectation active chez la
/// société holding ("atfm") — c'est elle qui pilote le portefeuille VC pour
/// tout le groupe (voir le bandeau "ATFM Legacy · Vue groupe" du prototype).
export function assertGroupAccess(actor: AuthenticatedUser) {
  if (!actor.societies.includes(HOLDING_SOCIETY)) {
    throw new ForbiddenException("Le module Investissements est réservé aux personnes affectées chez ATFM Legacy.");
  }
}
