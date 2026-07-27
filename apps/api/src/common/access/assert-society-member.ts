import { ForbiddenException } from "@nestjs/common";
import { AuthenticatedUser } from "../../auth/auth.types";

/// Les modules métier scopés par société (CRM, Projets, et les suivants — jamais
/// le Core Directory, qui est global) exigent qu'un acteur ait une affectation
/// active dans la société ciblée, quel que soit son rôle RBAC.
export function assertSocietyMember(actor: AuthenticatedUser, society: string) {
  if (!actor.societies.includes(society)) {
    throw new ForbiddenException(`Vous n'avez pas d'affectation active chez "${society}".`);
  }
}
