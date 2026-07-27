import { PrismaService } from "../prisma/prisma.service";

/// Mock minimal du client Prisma pour les tests unitaires de services — évite toute
/// dépendance à une vraie base Postgres. Ne couvre que les méthodes effectivement
/// appelées par AuthService / PeopleService.
export function createPrismaMock() {
  const client = {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    person: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    affectation: {
      update: jest.fn(),
      create: jest.fn(),
    },
    coreEvent: {
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  return { client } as unknown as PrismaService;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;
