import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

import { PrismaClient } from "@/generated/prisma/client";

const FALLBACK_DATABASE_URL =
  "postgresql://user:password@localhost:5432/ow_activity";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function assertDatabaseConfigured() {
  if (!isDatabaseConfigured()) {
    throw new Error(
      "数据库还没有配置。请先设置 DATABASE_URL 并执行 npm run db:deploy。",
    );
  }
}

function createPrismaClient() {
  // Local UI previews can run without a database. Vercel must use real storage.
  if (process.env.VERCEL === "1") {
    assertDatabaseConfigured();
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.trim() || FALLBACK_DATABASE_URL,
    // 本地 Prisma dev 基于单连接的 PGlite，串行查询避免并发协议冲突。
    max: process.env.NODE_ENV === "development" ? 1 : 5,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
  });

  attachDatabasePool(pool);
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
