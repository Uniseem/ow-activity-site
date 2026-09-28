import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ADMIN_SETUP_ID,
  AdminSetupClosedError,
  canSetUpAdmin,
  registerInitialAdmin,
} from "../src/lib/admin-setup";

const connectionString = process.env.ADMIN_SETUP_TEST_DATABASE_URL;
if (!connectionString)
  throw new Error(
    "请设置 ADMIN_SETUP_TEST_DATABASE_URL；测试只操作独立的临时 schema。",
  );
const password = "initial-admin-test-password";
const input = (username: string) => ({
  username,
  displayName: "测试管理员",
  password,
  confirmPassword: password,
});

async function withDatabase(
  run: (db: PrismaClient) => Promise<void>,
  legacyAdmin = false,
) {
  const schema = "admin_setup_test_" + randomUUID().replaceAll("-", "");
  assert.match(schema, /^admin_setup_test_[a-f0-9]{32}$/);
  const client = new Client({ connectionString });
  await client.connect();
  let db: PrismaClient | undefined;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    for (const migration of (await readdir("prisma/migrations"))
      .filter((name) => /^\d/.test(name))
      .sort()) {
      if (legacyAdmin && migration === "20260905140000_initial_admin_setup") {
        await client.query(
          'INSERT INTO "User" (id,username,"passwordHash",role,status,"updatedAt") VALUES ($1,$2,$3,$4,$5,NOW())',
          ["legacy", "legacy", "unused", "ADMIN", "BANNED"],
        );
      }
      const sql = (
        await readFile(
          join("prisma/migrations", migration, "migration.sql"),
          "utf8",
        )
      ).replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
      await client.query(sql);
    }
    db = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString, max: 4, options: `-c search_path=${schema}` },
        { schema },
      ),
    });
    await run(db);
  } finally {
    await db?.$disconnect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  }
}

test("注册失败回滚初始化机会，并发请求仅产生一名管理员", async () => {
  await withDatabase(async (db) => {
    assert.equal(await canSetUpAdmin(db), true);
    await db.user.create({
      data: { username: "existing", passwordHash: "unused" },
    });
    assert.equal(await canSetUpAdmin(db), true);
    await assert.rejects(registerInitialAdmin(db, input("existing")), {
      code: "P2002",
    });
    assert.equal(await canSetUpAdmin(db), true);

    const results = await Promise.allSettled([
      registerInitialAdmin(db, input("first")),
      registerInitialAdmin(db, input("second")),
    ]);
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const rejected = results.find((result) => result.status === "rejected");
    assert.ok(
      rejected?.status === "rejected" &&
        rejected.reason instanceof AdminSetupClosedError,
    );
    assert.equal(await db.user.count({ where: { role: "ADMIN" } }), 1);
    const admin = await db.user.findFirstOrThrow({
      where: { role: "ADMIN" },
      include: { profile: true },
    });
    assert.equal(admin.status, "APPROVED");
    assert.equal(admin.primaryAdmin, true);
    assert.equal(admin.profile?.reviewStatus, "APPROVED");
    assert.ok(admin.passwordHash);
    assert.equal(await bcrypt.compare(password, admin.passwordHash), true);
    const ordinary = await db.user.findUniqueOrThrow({
      where: { username: "existing" },
    });
    assert.equal(ordinary.role, "USER");
    assert.equal(ordinary.status, "PENDING");
    assert.equal(await canSetUpAdmin(db), false);
    await assert.rejects(
      registerInitialAdmin(db, input("third")),
      AdminSetupClosedError,
    );

    await db.user.delete({ where: { id: admin.id } });
    assert.equal(
      await canSetUpAdmin(db),
      false,
      "删除首位管理员也不能重新开放注册",
    );
    await assert.rejects(
      registerInitialAdmin(db, input("fourth")),
      AdminSetupClosedError,
    );
  });
});

test("已有管理员的旧站点升级后保持关闭，即使账号被封禁或删除", async () => {
  await withDatabase(async (db) => {
    assert.ok(
      (await db.adminSetup.findUniqueOrThrow({ where: { id: ADMIN_SETUP_ID } }))
        .completedAt,
    );
    assert.equal(await canSetUpAdmin(db), false);
    await db.user.deleteMany();
    assert.equal(await canSetUpAdmin(db), false);
    await assert.rejects(
      registerInitialAdmin(db, input("replacement")),
      AdminSetupClosedError,
    );
  }, true);
});

test("缺失初始化记录或已有管理员时拒绝首次注册", async () => {
  await withDatabase(async (db) => {
    await db.user.create({
      data: { username: "manual_admin", passwordHash: "unused", role: "ADMIN" },
    });
    assert.equal(await canSetUpAdmin(db), false);
    await assert.rejects(
      registerInitialAdmin(db, input("another")),
      AdminSetupClosedError,
    );
    await db.user.deleteMany();
    await db.adminSetup.deleteMany();
    assert.equal(await canSetUpAdmin(db), false);
    await assert.rejects(
      registerInitialAdmin(db, input("missing_state")),
      AdminSetupClosedError,
    );
  });
});
