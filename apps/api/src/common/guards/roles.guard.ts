import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIRED_ROLE_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../../auth/auth.types";

/// Vérifie que l'utilisateur authentifié porte le rôle requis (ex. "RH") dans au moins
/// une société. C'est la première barrière ; les services appliquent ensuite le contrôle
/// précis par société (le RH de Tech ne peut pas créer une personne chez Logistics).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRole = this.reflector.getAllAndOverride<string | undefined>(REQUIRED_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRole) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;
    const hasRole = user?.roles?.some((r) => r.role === requiredRole);
    if (!hasRole) {
      throw new ForbiddenException(`Rôle "${requiredRole}" requis pour cette action.`);
    }
    return true;
  }
}
