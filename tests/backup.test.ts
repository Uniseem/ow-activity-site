import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import {
  BACKUP_AUDIT_USER_FIELDS,
  BACKUP_FOREIGN_USER_FIELDS,
  BACKUP_FORMAT,
  BACKUP_MAX_CHUNKS,
  BACKUP_MAX_FILES,
  BACKUP_MAX_REQUEST_BYTES,
  BACKUP_MAX_UPLOAD_BASE64,
  BACKUP_TABLES,
  BACKUP_VERSION,
  BackupError,
  backupRequestSchema,
  fileChunkCount,
  isTrustedBackupOrigin,
  manifestChunkCount,
  validateBackupSnapshot,
  type BackupManifest,
  type BackupRow,
  type BackupSnapshot,
  type BackupTable,
} from "../src/lib/backup-format";
import {
  BACKUP_MAX_ZIP_BYTES,
  createBackupZip,
  inspectBackupZip,
  readBackupZip,
} from "../src/lib/backup-zip";

const HASH = "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const iso = (ms = Date.now()) => new Date(ms).toISOString();
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function fakePng(size: number) {
  const bytes = new Uint8Array(size);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  return bytes;
}

function snapshot(overrides: Partial<Record<BackupTable, BackupRow[]>> = {}): BackupSnapshot {
  return BACKUP_TABLES.map((table) => ({
    table,
    rows:
      overrides[table] ??
      (table === "AdminSetup"
        ? [{ id: "initial-admin", completedAt: iso() }]
        : table === "User"
          ? [
              {
                id: "admin1",
                username: "admin",
                passwordHash: HASH,
                role: "ADMIN",
                status: "APPROVED",
                createdAt: iso(),
                updatedAt: iso(),
              },
            ]
          : []),
  }));
}

test("审计字段指向已删账号仍接受，真实外键必须完整", () => {
  assert.deepEqual([...BACKUP_FOREIGN_USER_FIELDS], [
    "userId",
    "authorId",
    "createdById",
    "reviewedById",
  ]);
  assert.deepEqual([...BACKUP_AUDIT_USER_FIELDS], ["updatedById", "uploadedById"]);
  const valid = snapshot({
    SiteSettings: [
      {
        id: "site",
        values: {},
        revision: 1,
        updatedById: "deleted-admin",
        updatedAt: iso(),
      },
    ],
    UpdateSettings: [
      {
        id: "global",
        repositoryUrl: "https://github.com/Uniseem/ow-activity-site",
        branch: "",
        deployHook: null,
        revision: 1,
        updatedById: "deleted-admin",
        updatedAt: iso(),
      },
    ],
    OAuthConfig: [
      {
        provider: "github",
        clientId: "id",
        clientSecret: "secret",
        enabled: true,
        revision: 1,
        updatedById: "deleted-admin",
        updatedAt: iso(),
      },
    ],
    SiteAsset: [
      {
        id: "asset1",
        name: "logo.png",
        mimeType: "image/png",
        data: "",
        uploadedById: "deleted-uploader",
        createdAt: iso(),
      },
    ],
  });
  const parsed = validateBackupSnapshot(valid);
  assert.equal(parsed.preview.assets, 1);
  assert.equal(parsed.preview.hasSecrets, true);

  const missingAuthor = snapshot({
    Article: [
      {
        id: "a1",
        title: "标题",
        excerpt: "",
        coverUrl: "",
        content: "正文",
        status: "DRAFT",
        revision: 1,
        authorId: "missing",
        publishedAt: null,
        createdAt: iso(),
        updatedAt: iso(),
      },
    ],
  });
  assert.throws(() => validateBackupSnapshot(missingAuthor), BackupError);
  const missingReviewer = snapshot({
    Profile: [
      {
        id: "p1",
        userId: "admin1",
        avatarUrl: null,
        displayName: "管理员",
        slogan: "",
        battleTag: null,
        mainRole: null,
        mainHeroes: [],
        rank: null,
        onlineTime: null,
        contact: null,
        extraNote: null,
        reviewStatus: "APPROVED",
        reviewNote: null,
        reviewedById: "missing",
        reviewedAt: iso(),
        createdAt: iso(),
        updatedAt: iso(),
      },
    ],
  });
  assert.throws(() => validateBackupSnapshot(missingReviewer), BackupError);
});

test("分块上限覆盖 5,000 张小图，清单可放入 2 MB 请求", () => {
  const files = [
    { path: "data.json", bytes: 8 * 1024 * 1024, sha256: "a".repeat(64) },
    ...Array.from({ length: BACKUP_MAX_FILES - 1 }, (_, index) => ({
      path: `media/img${index}.bin`,
      bytes: 1,
      sha256: "b".repeat(64),
    })),
  ];
  const chunks = manifestChunkCount({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: iso(),
    files,
  });
  assert.ok(chunks <= BACKUP_MAX_CHUNKS);
  assert.equal(fileChunkCount(8 * 1024 * 1024), 22);
  assert.equal(
    backupRequestSchema.safeParse({
      operation: "download",
      id: randomUUID(),
      index: BACKUP_MAX_CHUNKS,
    }).success,
    true,
  );
  assert.equal(
    backupRequestSchema.safeParse({
      operation: "download",
      id: randomUUID(),
      index: BACKUP_MAX_CHUNKS + 1,
    }).success,
    false,
  );
  assert.equal(
    backupRequestSchema.safeParse({
      operation: "upload",
      id: randomUUID(),
      index: 0,
      data: "a".repeat(BACKUP_MAX_UPLOAD_BASE64 + 1),
    }).success,
    false,
  );
  const manifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: iso(),
    files,
  };
  assert.ok(Buffer.byteLength(JSON.stringify(manifest)) < BACKUP_MAX_REQUEST_BYTES);
  assert.equal(isTrustedBackupOrigin("https://ow.example.com", "https://ow.example.com"), true);
  assert.equal(isTrustedBackupOrigin(null, "https://ow.example.com"), false);
  assert.equal(isTrustedBackupOrigin("https://evil.example", "https://ow.example.com"), false);
});

test("ZIP 往返、大于 4.5 MB 的媒体分离包和损坏文件都会被拒绝", async () => {
  const data = Buffer.from(JSON.stringify(snapshot({
    SiteAsset: [
      {
        id: "big1",
        name: "a.png",
        mimeType: "image/png",
        data: "",
        uploadedById: "admin1",
        createdAt: iso(),
      },
      {
        id: "big2",
        name: "b.png",
        mimeType: "image/png",
        data: "",
        uploadedById: "admin1",
        createdAt: iso(),
      },
      {
        id: "big3",
        name: "c.png",
        mimeType: "image/png",
        data: "",
        uploadedById: "admin1",
        createdAt: iso(),
      },
    ],
  })));
  const media = [fakePng(1_700_000), fakePng(1_700_000), fakePng(1_700_000)];
  const manifest = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: iso(),
    files: [
      { path: "data.json", bytes: data.length, sha256: digest(data) },
      { path: "media/big1.bin", bytes: media[0].length, sha256: digest(media[0]) },
      { path: "media/big2.bin", bytes: media[1].length, sha256: digest(media[1]) },
      { path: "media/big3.bin", bytes: media[2].length, sha256: digest(media[2]) },
    ],
  } satisfies BackupManifest;
  const files = {
    "data.json": new Uint8Array(data),
    "media/big1.bin": media[0],
    "media/big2.bin": media[1],
    "media/big3.bin": media[2],
  };
  const zip = createBackupZip(manifest, files);
  assert.ok(zip.length > 4.5 * 1024 * 1024);
  assert.ok(zip.length < BACKUP_MAX_ZIP_BYTES);
  const read = await readBackupZip(zip);
  assert.equal(read.manifest.files.length, 4);
  assert.equal(read.files["data.json"].length, data.length);
  const damaged = new Uint8Array(zip);
  damaged[Math.floor(damaged.length / 2)] ^= 0xff;
  await assert.rejects(() => readBackupZip(damaged), BackupError);
  const slipped = zipSync({
    "manifest.json": strToU8("{}"),
    "data.json": strToU8("[]"),
    "../secret.bin": new Uint8Array([1, 2, 3]),
  });
  assert.throws(() => inspectBackupZip(slipped), BackupError);
});
