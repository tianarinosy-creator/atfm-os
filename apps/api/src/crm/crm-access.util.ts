import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";

/// Le CRM est scopé par société (contrairement au Core Directory, global) : un
/// acteur ne peut lire/écrire les données CRM que d'une société où il a une
/// affectation active, quel que soit son rôle RBAC.
export function assertSocietyMember(actor: AuthenticatedUser, society: string) {
  if (!actor.societies.includes(society)) {
    throw new ForbiddenException(`Vous n'avez pas d'affectation active chez "${society}".`);
  }
}
