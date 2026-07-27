import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";
import { JwtPayload } from "./auth.types";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const account = await this.prisma.client.account.findUnique({
      where: { username },
      include: {
        person: {
          include: { affectations: true, roles: true },
        },
      },
    });

    if (!account) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    const passwordValid = await bcrypt.compare(password, account.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException("Identifiants invalides.");
    }

    // Règle métier : statut Inactif => connexion impossible. Une affectation clôturée
    // (exitDate posée par un transfert) ne compte jamais comme active, quel que soit
    // son statut historique. Si aucune affectation en cours n'est Actif, plus d'accès.
    const hasActiveAffectation = account.person.affectations.some((a) => !a.exitDate && a.status === "Actif");
    if (!hasActiveAffectation) {
      throw new UnauthorizedException("Ce compte est inactif sur toutes ses affectations.");
    }

    await this.prisma.client.account.update({
      where: { personId: account.personId },
      data: { lastLogin: new Date() },
    });

    const payload: JwtPayload = {
      sub: account.personId,
      username: account.username,
      name: `${account.person.firstName} ${account.person.lastName}`.trim(),
      roles: account.person.roles.map((r) => ({ society: r.society, role: r.role })),
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: payload,
    };
  }
}
