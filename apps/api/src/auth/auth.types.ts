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
}

export interface JwtPayload {
  sub: string;
  username: string;
  name: string;
  roles: AuthenticatedUserRole[];
}
