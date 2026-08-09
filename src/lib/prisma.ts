import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

const FALLBACK_DATABASE_URL = "postgresql://user:password@localhost:5432/ow_activity";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function isDatabaseConfigured() {
  const databaseUrl = process.env.DATABASE_URL;

  return Boolean(
    databaseUrl &&
      !databaseUrl.includes("johndoe:randompassword@localhost") &&
      !databaseUrl.includes("USER:PASSWORD@HOST") &&
      !databaseUrl.includes("localhost:5432/mydb"),
  );
}

export function assertDatabaseConfigured() {
  if (!isDatabaseConfigured()) {
    throw new Error("数据库还没有配置。请先设置 DATABASE_URL 并执行数据库初始化。");
  }
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? FALLBACK_DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
