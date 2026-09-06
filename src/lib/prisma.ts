import "server-only";

import { createRequire } from "node:module";
import { join } from "node:path";
import type { PrismaPg } from "@prisma/adapter-pg";
import type { attachDatabasePool } from "@vercel/functions";
import type { Pool } from "pg";

import { PrismaClient, Prisma } from "@/generated/prisma/client";
import type {
  PrismaClient as D1PrismaClient,
  Prisma as D1PrismaNamespace,
} from "@/generated/prisma-d1/client";
import type { PrismaD1 } from "@prisma/adapter-d1";
import { D1_CLIENT, isD1Database } from "@/lib/database-provider";
import { getD1 } from "@/lib/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

type D1Runtime = {
  PrismaClient: typeof D1PrismaClient;
  Prisma: typeof D1PrismaNamespace;
  PrismaD1: typeof PrismaD1;
};

type PgRuntime = {
  PrismaPg: typeof PrismaPg;
  attachDatabasePool: typeof attachDatabasePool;
  Pool: typeof Pool;
};

let d1Runtime: D1Runtime | undefined;
function loadD1Runtime(): D1Runtime {
  if (d1Runtime) return d1Runtime;
  const nodeRequire = createRequire(join(process.cwd(), "package.json"));
  const generated = nodeRequire("./src/generated/prisma-d1/client") as {
    PrismaClient: typeof D1PrismaClient;
    Prisma: typeof D1PrismaNamespace;
  };
  const adapter = nodeRequire("@prisma/adapter-d1") as {
    PrismaD1: typeof PrismaD1;
  };
  d1Runtime = {
    PrismaClient: generated.PrismaClient,
    Prisma: generated.Prisma,
    PrismaD1: adapter.PrismaD1,
  };
  return d1Runtime;
}

let pgRuntime: PgRuntime | undefined;
function loadPgRuntime(): PgRuntime {
  if (pgRuntime) return pgRuntime;
  const nodeRequire = createRequire(join(process.cwd(), "package.json"));
  const adapter = nodeRequire("@prisma/adapter-pg") as {
    PrismaPg: typeof PrismaPg;
  };
  const vercel = nodeRequire("@vercel/functions") as {
    attachDatabasePool: typeof attachDatabasePool;
  };
  const pg = nodeRequire("pg") as { Pool: typeof Pool };
  pgRuntime = {
    PrismaPg: adapter.PrismaPg,
    attachDatabasePool: vercel.attachDatabasePool,
    Pool: pg.Pool,
  };
  return pgRuntime;
}

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

  const { Pool, PrismaPg, attachDatabasePool } = loadPgRuntime();
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.trim() || FALLBACK_DATABASE_URL,
    // 本地 Prisma dev 基于单连接的 PGlite，串行查询避免并发协议冲突。
    max: process.env.NODE_ENV === "development" ? 1 : 5,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 10000,
  });

  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const d1Clients = new WeakMap<D1Database, PrismaClient>();

// SQLite LIKE is already ASCII case-insensitive; the PostgreSQL-only mode
// option must not be sent to the SQLite generated client.
function sqliteInput(value: unknown): unknown {
  const D1Prisma = loadD1Runtime().Prisma;
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
  const runtime = loadD1Runtime();
  const client = new runtime.PrismaClient({ adapter: new runtime.PrismaD1(binding) });
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
