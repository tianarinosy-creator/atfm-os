import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __atfmPrisma: PrismaClient | undefined;
}

export const prisma = globalThis.__atfmPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__atfmPrisma = prisma;
}

export * from "@prisma/client";
