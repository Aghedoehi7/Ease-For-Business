import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}