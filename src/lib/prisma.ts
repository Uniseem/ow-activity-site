import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

import { PrismaClient, Prisma } from "@/generated/prisma/client";
import {
  PrismaClient as D1PrismaClient,
  Prisma as D1Prisma,
} from "@/generated/prisma-d1/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { D1_CLIENT, isD1Database } from "@/lib/database-provider";
import { getD1 } from "@/lib/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

const FALLBACK_DATABASE_URL =
  "postgresql://user:password@localhost:5432/ow_activity";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export function isDatabaseConfigured() {
  return isD1Database() || Boolean(process.env.DATABASE_URL?.trim());
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

const d1Clients = new WeakMap<D1Database, PrismaClient>();

// SQLite LIKE is already ASCII case-insensitive; the PostgreSQL-only mode
// option must not be sent to the SQLite generated client.
function sqliteInput(value: unknown): unknown {
  if (value === Prisma.DbNull) return D1Prisma.DbNull;
  if (value === Prisma.JsonNull) return D1Prisma.JsonNull;
  if (value === Prisma.AnyNull) return D1Prisma.AnyNull;
  if (Array.isArray(value)) return value.map(sqliteInput);
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Date ||
    ArrayBuffer.isView(value)
  )
    return value;
  const filter =
    "contains" in value ||
    "equals" in value ||
    "startsWith" in value ||
    "endsWith" in value ||
    "in" in value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !filter || key !== "mode")
      .map(([key, item]) => [key, sqliteInput(item)]),
  );
}

function normalizeLists(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeLists);
  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Date ||
    ArrayBuffer.isView(value)
  )
    return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (key === "mainHeroes" || key === "heroes") {
        if (
          !Array.isArray(item) ||
          !item.every((entry) => typeof entry === "string")
        )
          throw new Error("数据库中的英雄列表格式无效。");
        return [key, item];
      }
      return [key, normalizeLists(item)];
    }),
  );
}

function currentClient(): PrismaClient {
  if (!isD1Database()) return (globalForPrisma.prisma ??= createPrismaClient());
  const binding = getD1();
  const existing = d1Clients.get(binding);
  if (existing) return existing;
  const client = new D1PrismaClient({ adapter: new PrismaD1(binding) });
  const guarded = new Proxy(client, {
    get(target, property) {
      if (property === D1_CLIENT) return true;
      if (property === "$transaction")
        return () => {
          throw new Error(
            "D1 不支持 Prisma 事务。请使用经过审计的 D1 batch 原子操作。",
          );
        };
      const value = Reflect.get(target, property, target);
      if (typeof value === "function") return value.bind(target);
      if (
        typeof property === "string" &&
        !property.startsWith("$") &&
        value &&
        typeof value === "object"
      ) {
        return new Proxy(value, {
          get(delegate, method) {
            const action = Reflect.get(delegate, method, delegate);
            return typeof action === "function"
              ? async (...args: unknown[]) =>
                  normalizeLists(
                    await action.apply(delegate, args.map(sqliteInput)),
                  )
              : action;
          },
        });
      }
      return value;
    },
  }) as unknown as PrismaClient;
  d1Clients.set(binding, guarded);
  return guarded;
}

// Access bindings only while handling a request, never while importing modules
// at build time. PostgreSQL keeps its existing pooled client.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = currentClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
