import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";
import { createPrismaMock, PrismaMock } from "../test/prisma-mock";

// Coût réduit uniquement pour accélérer les tests — jamais en production.
const CORRECT_PASSWORD = "correct-password";
const PASSWORD_HASH = bcrypt.hashSync(CORRECT_PASSWORD, 4);

function buildAccount(affectations: Array<{ status: string; exitDate: Date | null; society?: string }>) {
  return {
    personId: "person-1",
    username: "jane.doe",
    passwordHash: PASSWORD_HASH,
    mfaEnabled: false,
    lastLogin: null,
    person: {
      firstName: "Jane",
      lastName: "Doe",
      affectations: affectations.map((a) => ({ society: "logistics", ...a })),
      roles: [{ society: "logistics", role: "RH" }],
    },
  };
}

describe("AuthService", () => {
  let prisma: PrismaMock;
  let jwtService: JwtService;
  let authService: AuthService;

  beforeEach(() => {
    prisma = createPrismaMock();
    jwtService = { signAsync: jest.fn().mockResolvedValue("signed.jwt.token") } as unknown as JwtService;
    authService = new AuthService(prisma, jwtService);
  });

  it("rejette un identifiant inconnu", async () => {
    (prisma.client.account.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(authService.login("ghost", "whatever")).rejects.toThrow(UnauthorizedException);
  });

  it("rejette un mot de passe invalide", async () => {
    (prisma.client.account.findUnique as jest.Mock).mockResolvedValue(
      buildAccount([{ status: "Actif", exitDate: null }]),
    );

    await expect(authService.login("jane.doe", "wrong-password")).rejects.toThrow(UnauthorizedException);
  });

  it("bloque la connexion si toutes les affectations sont Inactif ou clôturées", async () => {
    // Régression : une affectation clôturée par un transfert (exitDate posée) garde
    // un statut Actif historique — elle ne doit jamais compter comme active.
    (prisma.client.account.findUnique as jest.Mock).mockResolvedValue(
      buildAccount([
        { status: "Actif", exitDate: new Date("2026-01-01") },
        { status: "Inactif", exitDate: null },
      ]),
    );

    await expect(authService.login("jane.doe", CORRECT_PASSWORD)).rejects.toThrow(
      "Ce compte est inactif sur toutes ses affectations.",
    );
  });

  it("autorise la connexion dès qu'une affectation active et non clôturée existe", async () => {
    (prisma.client.account.findUnique as jest.Mock).mockResolvedValue(
      buildAccount([
        { status: "Actif", exitDate: new Date("2026-01-01") },
        { status: "Actif", exitDate: null },
      ]),
    );

    const result = await authService.login("jane.doe", CORRECT_PASSWORD);

    expect(result.accessToken).toBe("signed.jwt.token");
    expect(result.user).toMatchObject({
      sub: "person-1",
      username: "jane.doe",
      name: "Jane Doe",
      roles: [{ society: "logistics", role: "RH" }],
      societies: ["logistics"],
    });
    expect(prisma.client.account.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { personId: "person-1" } }),
    );
  });

  it("déduplique les sociétés actives (multi-affectations dans une même société)", async () => {
    (prisma.client.account.findUnique as jest.Mock).mockResolvedValue(
      buildAccount([
        { status: "Actif", exitDate: null, society: "logistics" },
        { status: "Actif", exitDate: null, society: "logistics" },
        { status: "Actif", exitDate: null, society: "tech" },
        { status: "Actif", exitDate: new Date("2026-01-01"), society: "housing" },
      ]),
    );

    const result = await authService.login("jane.doe", CORRECT_PASSWORD);

    expect(result.user.societies.sort()).toEqual(["logistics", "tech"]);
  });
});
