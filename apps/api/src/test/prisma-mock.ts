import { PrismaService } from "../prisma/prisma.service";

/// Mock minimal du client Prisma pour les tests unitaires de services — évite toute
/// dépendance à une vraie base Postgres. Ne couvre que les méthodes effectivement
/// appelées par AuthService / PeopleService / ContactsService / DealsService.
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
    crmContact: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    crmDeal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    crmActivity: {
      create: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    projectMember: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    projectTask: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    projectTaskChecklistItem: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectTaskComment: {
      create: jest.fn(),
    },
    projectExpense: {
      create: jest.fn(),
    },
    projectRisk: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    financeInvoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    financeExpense: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    financeBudget: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };

  return { client } as unknown as PrismaService;
}

export type PrismaMock = ReturnType<typeof createPrismaMock>;
