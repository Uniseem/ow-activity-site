import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import bcrypt from "bcryptjs";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  BACKUP_CHUNK_BYTES,
  BackupError,
  validateBackupSnapshot,
} from "../src/lib/backup-format";
import {
  cancelBackupTransfer,
  downloadBackupChunk,
  previewBackupImport,
  replaceDatabaseSnapshot,
  restoreBackupImport,
  startBackupExport,
  startBackupImport,
  uploadBackupChunk,
} from "../src/lib/backup-service";
import {
  createBackupZip,
  readBackupZip,
} from "../src/lib/backup-zip";
import { seal, unseal } from "../src/lib/oauth/security";

const connectionString = process.env.BACKUP_TEST_DATABASE_URL;
if (!connectionString)
  throw new Error("请设置 BACKUP_TEST_DATABASE_URL；测试只操作独立临时 schema。");

const password = "Restore-pass-1";
const sourceKey = randomBytes(32).toString("hex");
const targetKey = randomBytes(32).toString("hex");
const hook = "https://api.vercel.com/v1/integrations/deploy/prj_example/testSecret";

function fakePng(size: number) {
  const bytes = Buffer.alloc(size, 7);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  return bytes;
}

async function withSchema(
  prefix: string,
  run: (db: PrismaClient, schema: string) => Promise<void>,
) {
  const schema = `${prefix}_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, new RegExp(`^${prefix}_[a-f0-9]{32}$`));
  const client = new Client({ connectionString });
  await client.connect();
  let db: PrismaClient | undefined;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    for (const migration of (await readdir("prisma/migrations"))
      .filter((name) => /^\d/.test(name))
      .sort()) {
      const sql = (
        await readFile(join("prisma/migrations", migration, "migration.sql"), "utf8")
      ).replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
      await client.query(sql);
    }
    db = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString, max: 4, options: `-c search_path=${schema}` },
        { schema },
      ),
    });
    await run(db, schema);
  } finally {
    await db?.$disconnect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  }
}

async function seedSource(db: PrismaClient) {
  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await db.user.create({
    data: {
      username: "source-admin",
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
      profile: {
        create: {
          displayName: "源站管理员",
          slogan: "交大守望",
          reviewStatus: "APPROVED",
          avatarUrl: `data:image/png;base64,${fakePng(64).toString("base64")}`,
        },
      },
    },
  });
  const player = await db.user.create({
    data: {
      username: "source-player",
      passwordHash,
      role: "USER",
      status: "APPROVED",
      profile: {
        create: { displayName: "源站玩家", slogan: "报名测试", reviewStatus: "APPROVED" },
      },
    },
  });
  await db.session.create({
    data: {
      userId: admin.id,
      tokenHash: randomUUID(),
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  await db.oAuthConfig.update({
    where: { provider: "github" },
    data: {
      clientId: "github-client",
      encryptedSecret: seal("github-secret", "oauth-config:github", sourceKey),
      enabled: true,
      revision: 1,
      updatedById: "deleted-admin",
    },
  });
  await db.oAuthAccount.create({
    data: {
      userId: player.id,
      provider: "github",
      providerAccountId: "12345",
      email: "player@example.com",
    },
  });
  await db.updateSettings.update({
    where: { id: "global" },
    data: {
      repositoryUrl: "https://github.com/Uniseem/ow-activity-site",
      encryptedDeployHook: seal(hook, "site-update:vercel-deploy-hook", sourceKey),
      revision: 1,
      updatedById: "deleted-admin",
    },
  });
  await db.siteSettings.create({
    data: { id: "site", values: { siteName: "源站" }, revision: 1, updatedById: "deleted-admin" },
  });
  const asset = await db.siteAsset.create({
    data: {
      id: "cover-large",
      name: "cover.png",
      mimeType: "image/png",
      data: fakePng(1_600_000),
      uploadedById: "deleted-uploader",
    },
  });
  await db.siteAsset.create({
    data: {
      name: "extra-a.png",
      mimeType: "image/png",
      data: fakePng(1_600_000),
      uploadedById: "deleted-uploader",
    },
  });
  await db.siteAsset.create({
    data: {
      name: "extra-b.png",
      mimeType: "image/png",
      data: fakePng(1_600_000),
      uploadedById: admin.id,
    },
  });
  const event = await db.event.create({
    data: {
      title: "周五内战",
      description: "源站活动",
      coverUrl: `/api/site-assets/${asset.id}`,
      type: "SCRIM",
      startTime: new Date("2026-09-11T12:00:00.000Z"),
      maxParticipants: 12,
      status: "OPEN",
      createdById: admin.id,
    },
  });
  await db.eventRegistration.create({
    data: {
      eventId: event.id,
      userId: player.id,
      status: "APPROVED",
      reviewedById: admin.id,
    },
  });
  await db.article.create({
    data: {
      title: "备份测试文章",
      excerpt: "摘要",
      content: "正文",
      status: "PUBLISHED",
      authorId: admin.id,
      publishedAt: new Date(),
    },
  });
  await db.adminSetup.update({
    where: { id: "initial-admin" },
    data: { completedAt: new Date() },
  });
  return { admin, player };
}

async function assembleExport(db: PrismaClient, ownerId: string, key: string) {
  const exported = await startBackupExport(db, ownerId, key);
  const files: Record<string, Uint8Array> = {};
  let index = 0;
  for (const file of exported.manifest.files) {
    const bytes = new Uint8Array(file.bytes);
    for (let offset = 0; offset < file.bytes; offset += BACKUP_CHUNK_BYTES) {
      const chunk = await downloadBackupChunk(db, exported.id, ownerId, index++);
      bytes.set(Buffer.from(chunk.data, "base64"), offset);
    }
    files[file.path] = bytes;
  }
  await cancelBackupTransfer(db, exported.id, ownerId);
  return { zip: createBackupZip(exported.manifest, files), preview: exported.preview };
}

async function importZip(
  db: PrismaClient,
  ownerId: string,
  key: string,
  zip: Uint8Array,
  confirmation: string,
) {
  const { manifest, files } = await readBackupZip(zip);
  const started = await startBackupImport(db, ownerId, manifest);
  let index = 0;
  for (const file of manifest.files) {
    for (let offset = 0; offset < file.bytes; offset += BACKUP_CHUNK_BYTES) {
      await uploadBackupChunk(
        db,
        started.id,
        ownerId,
        index++,
        Buffer.from(files[file.path].subarray(offset, offset + BACKUP_CHUNK_BYTES)).toString("base64"),
      );
    }
  }
  const preview = await previewBackupImport(db, started.id, ownerId, key);
  const restored = await restoreBackupImport(db, started.id, ownerId, key, confirmation);
  return { preview, restored };
}

test("整站备份跨密钥恢复：密码可登录、目标账号消失、会话清除、图片与审计字段保留", async () => {
  await withSchema("backup_src", async (source) => {
    const { admin } = await seedSource(source);
    const { zip, preview } = await assembleExport(source, admin.id, sourceKey);
    assert.ok(zip.length > 4.5 * 1024 * 1024);
    assert.equal(preview.users, 2);
    assert.ok(preview.administrators.includes("source-admin"));
    await assert.rejects(downloadBackupChunk(source, randomUUID(), admin.id, 0), BackupError);

    await withSchema("backup_dst", async (target) => {
      const targetAdmin = await target.user.create({
        data: {
          username: "target-admin",
          passwordHash: await bcrypt.hash("other-password", 10),
          role: "ADMIN",
          status: "APPROVED",
        },
      });
      await target.user.create({ data: { username: "should-disappear", role: "USER", status: "APPROVED" } });
      await target.session.create({
        data: {
          userId: targetAdmin.id,
          tokenHash: "old-session",
          expiresAt: new Date(Date.now() + 86_400_000),
        },
      });
      await target.adminSetup.update({
        where: { id: "initial-admin" },
        data: { completedAt: new Date() },
      });
      const result = await importZip(target, targetAdmin.id, targetKey, zip, "覆盖恢复");
      assert.equal(result.preview.preview.users, 2);
      assert.equal(await target.user.count(), 2);
      assert.equal(await target.user.count({ where: { username: "should-disappear" } }), 0);
      assert.equal(await target.session.count(), 0);
      const restoredAdmin = await target.user.findUniqueOrThrow({ where: { username: "source-admin" } });
      assert.equal(await bcrypt.compare(password, restoredAdmin.passwordHash!), true);
      const oauth = await target.oAuthConfig.findUniqueOrThrow({ where: { provider: "github" } });
      assert.equal(unseal(oauth.encryptedSecret!, "oauth-config:github", targetKey), "github-secret");
      assert.notEqual(oauth.encryptedSecret, null);
      const settings = await target.updateSettings.findUniqueOrThrow({ where: { id: "global" } });
      assert.equal(unseal(settings.encryptedDeployHook!, "site-update:vercel-deploy-hook", targetKey), hook);
      assert.equal(await target.siteAsset.count(), 4);
      const orphan = await target.siteAsset.findFirst({ where: { uploadedById: "deleted-uploader" } });
      assert.ok(orphan);
      assert.equal(orphan.data.length, 1_600_000);
      assert.equal(await target.article.count(), 1);
      assert.equal(await target.eventRegistration.count(), 1);
      const profile = await target.profile.findFirstOrThrow({
        where: { user: { username: "source-admin" } },
      });
      assert.match(profile.avatarUrl || "", /^\/api\/site-assets\/backup-avatar-/);
      await assert.rejects(
        restoreBackupImport(target, randomUUID(), targetAdmin.id, targetKey, "覆盖"),
        /覆盖恢复/,
      );
    });
  });
});

test("权限、损坏分块和恢复失败都不会部分覆盖现有数据", async () => {
  await withSchema("backup_rb", async (db) => {
    const admin = await db.user.create({
      data: {
        username: "keep-admin",
        passwordHash: await bcrypt.hash(password, 10),
        role: "ADMIN",
        status: "APPROVED",
      },
    });
    await db.adminSetup.update({
      where: { id: "initial-admin" },
      data: { completedAt: new Date() },
    });
    await db.siteAsset.create({
      data: {
        name: "keep.png",
        mimeType: "image/png",
        data: fakePng(64),
        uploadedById: "deleted-uploader",
      },
    });
    const exported = await startBackupExport(db, admin.id, sourceKey);
    await assert.rejects(downloadBackupChunk(db, exported.id, "other-admin", 0), /无权|过期/);
    const first = await downloadBackupChunk(db, exported.id, admin.id, 0);
    const started = await startBackupImport(db, admin.id, exported.manifest);
    await assert.rejects(
      uploadBackupChunk(db, started.id, "other-admin", 0, first.data),
      /无权|过期/,
    );
    await assert.rejects(
      uploadBackupChunk(db, started.id, admin.id, 0, "%%%"),
      /分块大小或编码/,
    );
    await cancelBackupTransfer(db, started.id, admin.id);

    const files: Record<string, Uint8Array> = {};
    let index = 0;
    for (const file of exported.manifest.files) {
      const bytes = new Uint8Array(file.bytes);
      for (let offset = 0; offset < file.bytes; offset += BACKUP_CHUNK_BYTES) {
        const chunk = await downloadBackupChunk(db, exported.id, admin.id, index++);
        bytes.set(Buffer.from(chunk.data, "base64"), offset);
      }
      files[file.path] = bytes;
    }
    const { snapshot } = validateBackupSnapshot(
      JSON.parse(Buffer.from(files["data.json"]).toString("utf8")),
    );
    const broken = await startBackupImport(db, admin.id, exported.manifest);
    await uploadBackupChunk(db, broken.id, admin.id, 0, Buffer.from(files["data.json"].subarray(0, Math.min(BACKUP_CHUNK_BYTES, files["data.json"].length))).toString("base64"));
    await assert.rejects(
      replaceDatabaseSnapshot(db, snapshot, admin.id, {
        transferId: broken.id,
        manifest: exported.manifest,
      }),
      BackupError,
    );
    assert.equal(await db.user.count({ where: { username: "keep-admin" } }), 1);
    await cancelBackupTransfer(db, broken.id, admin.id);
    await cancelBackupTransfer(db, exported.id, admin.id);
  });
});
