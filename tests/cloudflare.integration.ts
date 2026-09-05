import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPlatformProxy } from "wrangler";
import {
  createD1User,
  d1Date,
  newDatabaseId,
  reviewD1Profile,
  reviewD1Registration,
  syncD1EventStatuses,
} from "../src/lib/d1-atomic";
import { finishD1OAuthAccount } from "../src/lib/oauth/d1-accounts";
import {
  exportD1Snapshot,
  readD1BackupAsset,
  replaceD1Snapshot,
  writeD1RestoreAsset,
} from "../src/lib/database-transfer";
import type { SiteCloudflareEnv } from "../src/lib/cloudflare";

test("Cloudflare D1 原子注册、审批、OAuth、R2 和全量恢复", async (t) => {
  const platform = await getPlatformProxy<SiteCloudflareEnv>({
    configPath: "wrangler.jsonc",
    persist: false,
  });
  const context = Symbol.for("__cloudflare-context__");
  Object.defineProperty(globalThis, context, {
    configurable: true,
    value: { env: platform.env },
  });
  const db = platform.env.DB;
  try {
    for (const file of ["0001_init.sql", "0002_atomic_guards.sql"]) {
      const sql = await readFile(
        `prisma/cloudflare/migrations/${file}`,
        "utf8",
      );
      await db.batch(
        sql
          .split(";")
          .map((statement) => statement.trim())
          .filter(Boolean)
          .map((statement) => db.prepare(statement)),
      );
    }
    const input = {
      username: "firstadmin",
      passwordHash: "fixture-hash",
      displayName: "管理员",
      slogan: "活动",
      initialAdmin: true,
    };
    const race = await Promise.allSettled([
      createD1User(input),
      createD1User({ ...input, username: "secondadmin" }),
    ]);
    assert.equal(
      race.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const admin = (await db
      .prepare(`SELECT "id" FROM "User" WHERE "role"='ADMIN'`)
      .first<{ id: string }>())!;
    assert.equal(
      (await db
        .prepare('SELECT COUNT(*) AS n FROM "Profile"')
        .first<{ n: number }>())!.n,
      1,
    );
    await t.test("普通注册失败整批回滚", async () => {
      const before = await db
        .prepare('SELECT COUNT(*) AS n FROM "User"')
        .first<{ n: number }>();
      await assert.rejects(createD1User({ ...input, initialAdmin: false }));
      assert.equal(
        (await db
          .prepare('SELECT COUNT(*) AS n FROM "User"')
          .first<{ n: number }>())!.n,
        before!.n,
      );
    });
    const one = await createD1User({
        ...input,
        username: "playerone",
        initialAdmin: false,
      }),
      two = await createD1User({
        ...input,
        username: "playertwo",
        initialAdmin: false,
      });
    const profile = (await db
      .prepare('SELECT "id" FROM "Profile" WHERE "userId"=?')
      .bind(one.id)
      .first<{ id: string }>())!;
    await reviewD1Profile(profile.id, "APPROVED", null, admin.id);
    assert.equal(
      (await db
        .prepare('SELECT "status" FROM "User" WHERE "id"=?')
        .bind(one.id)
        .first<{ status: string }>())!.status,
      "APPROVED",
    );
    const eventId = newDatabaseId(),
      now = d1Date();
    await db
      .prepare(
        `INSERT INTO "Event" ("id","title","description","startTime","maxParticipants","status","createdById","createdAt","updatedAt") VALUES (?,?,?, ?,1,'OPEN',?,?,?)`,
      )
      .bind(
        eventId,
        "测试活动",
        "测试",
        d1Date(new Date("2026-09-06T06:00:00Z")),
        admin.id,
        now,
        now,
      )
      .run();
    const registrations = [newDatabaseId(), newDatabaseId()];
    await db.batch(
      [one, two].map((user, index) =>
        db
          .prepare(
            'INSERT INTO "EventRegistration" ("id","eventId","userId","createdAt","updatedAt") VALUES (?,?,?,?,?)',
          )
          .bind(registrations[index], eventId, user.id, now, now),
      ),
    );
    await t.test("并发审批不能超额", async () => {
      const results = await Promise.all(
        registrations.map((id) =>
          reviewD1Registration(id, eventId, "APPROVED", admin.id),
        ),
      );
      assert.deepEqual(results.sort(), ["full", "saved"]);
    });
    await t.test("上海日期状态同步", async () => {
      const result = await syncD1EventStatuses(
        new Date("2026-09-05T16:00:00Z"),
        new Date("2026-09-06T16:00:00Z"),
        new Date("2026-09-06T02:00:00Z"),
      );
      assert.equal(result.running, 1);
    });
    await db
      .prepare(
        'INSERT INTO "OAuthConfig" ("provider","clientId","enabled","revision","updatedAt") VALUES (?,?,1,1,?)',
      )
      .bind("github", "fixture", now)
      .run();
    await t.test("重复 OAuth 回调仅创建一个用户与关联", async () => {
      const identity = {
        accountId: "test-oauth",
        name: "OAuth玩家",
        avatarUrl: null,
        email: null,
      };
      const results = await Promise.all([
        finishD1OAuthAccount("github", 1, identity, null),
        finishD1OAuthAccount("github", 1, identity, null),
      ]);
      assert.equal(results[0].user.id, results[1].user.id);
      assert.equal(results.filter((result) => result.created).length, 1);
      await assert.rejects(finishD1OAuthAccount("github", 0, identity, null));
      await assert.rejects(finishD1OAuthAccount("github", 1, identity, one.id));
    });
    await t.test("备份与覆盖恢复包含 R2 媒体，失败时旧库完整", async () => {
      const snapshot = await exportD1Snapshot();
      const damaged = structuredClone(snapshot);
      damaged.find((entry) => entry.table === "Profile")!.rows[0].userId =
        "missing-user";
      await assert.rejects(replaceD1Snapshot(damaged, { adminId: admin.id }));
      assert.ok(
        await db
          .prepare('SELECT "id" FROM "User" WHERE "id"=?')
          .bind(admin.id)
          .first(),
      );
      const bytes = new Uint8Array([1, 2, 3, 4]),
        key = await writeD1RestoreAsset(bytes, "image/png");
      snapshot
        .find((entry) => entry.table === "SiteAsset")!
        .rows.push({
          id: newDatabaseId(),
          name: "fixture.png",
          mimeType: "image/png",
          storageKey: key,
          byteSize: bytes.length,
          data: "",
          uploadedById: admin.id,
          createdAt: now,
        });
      await replaceD1Snapshot(snapshot, { adminId: admin.id });
      assert.deepEqual(await readD1BackupAsset(key), bytes);
      const roundtrip = await exportD1Snapshot();
      assert.equal(
        roundtrip.find((entry) => entry.table === "SiteAsset")!.rows.length,
        1,
      );
      assert.equal(
        (await db
          .prepare('SELECT COUNT(*) AS n FROM "_AtomicGuard"')
          .first<{ n: number }>())!.n,
        0,
      );
    });
  } finally {
    Reflect.deleteProperty(globalThis, context);
    await platform.dispose();
  }
});
