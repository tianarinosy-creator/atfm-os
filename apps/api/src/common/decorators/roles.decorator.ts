import { SetMetadata } from "@nestjs/common";

export const REQUIRED_ROLE_KEY = "requiredRole";

/// Exige que l'utilisateur porte ce rôle (ex. "RH") dans AU MOINS une société pour
/// atteindre l'endpoint. Le contrôle fin par société est fait ensuite dans le service
/// (voir PeopleService), car la société cible dépend souvent du corps de la requête.
export const RequireRole = (role: string) => SetMetadata(REQUIRED_ROLE_KEY, role);
