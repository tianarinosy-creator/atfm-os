export interface AuthenticatedUserRole {
  society: string;
  role: string;
}

/// Forme du payload JWT et de req.user une fois authentifié.
export interface AuthenticatedUser {
  personId: string;
  username: string;
  name: string;
  roles: AuthenticatedUserRole[];
  // Sociétés où la personne a une affectation active (non clôturée, statut Actif) —
  // détermine l'appartenance multi-tenant, indépendamment des rôles RBAC (RH, Commercial…).
  societies: string[];
}

export interface JwtPayload {
  sub: string;
  username: string;
  name: string;
  roles: AuthenticatedUserRole[];
  societies: string[];
}
