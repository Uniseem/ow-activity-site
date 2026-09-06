import { getAssetBucket, getD1 } from "@/lib/cloudflare";
import {
  clearGuards,
  d1Date,
  guardStatement,
  newDatabaseId,
} from "@/lib/d1-atomic";
import {
  BACKUP_MAX_BYTES,
  BACKUP_MAX_ROWS,
  BACKUP_TABLES,
  BackupError,
  type BackupSnapshot,
} from "@/lib/backup-format";

// Fixed identifiers only. Uploaded JSON never chooses a SQL table or column.
const columns: Record<string, string[]> = {
  User: "id username passwordHash role status primaryAdmin adminPermissions createdAt updatedAt".split(" "),
  Profile:
    "id userId avatarUrl displayName slogan battleTag mainRole mainHeroes rank onlineTime contact extraNote reviewStatus reviewNote reviewedById reviewedAt createdAt updatedAt".split(
      " ",
    ),
  AdminSetup: "id completedAt".split(" "),
  OAuthConfig:
    "provider clientId encryptedSecret enabled revision updatedById updatedAt".split(
      " ",
    ),
  OAuthAccount: "id userId provider providerAccountId email createdAt".split(
    " ",
  ),
  UpdateSettings:
    "id repositoryUrl branch encryptedDeployHook revision checkKey checkResult checkedAt checkLease checkLeaseUntil deployRequestedAt deployRequestedSha deployJobId updatedById updatedAt".split(
      " ",
    ),
  AiSettings:
    "id preset baseUrl encryptedApiKey model autoReview revision updatedById updatedAt".split(
      " ",
    ),
  Event:
    "id title description coverUrl type customType startTime signupDeadline signupClosed maxParticipants requirements voiceChannel status createdById createdAt updatedAt".split(
      " ",
    ),
  EventRegistration:
    "id eventId userId preferredRole heroes voiceAvailable note status reviewedById reviewedAt createdAt updatedAt".split(
      " ",
    ),
  Article:
    "id title excerpt coverUrl content status revision authorId publishedAt createdAt updatedAt".split(
      " ",
    ),
  SiteSettings: "id values revision updatedById updatedAt".split(" "),
  SiteAsset:
    "id name mimeType uploadedById createdAt storageKey byteSize".split(" "),
};
const dates = new Set(
  "createdAt updatedAt reviewedAt completedAt expiresAt publishedAt startTime signupDeadline checkedAt checkLeaseUntil deployRequestedAt".split(
    " ",
  ),
);
const jsonFields = new Set(["mainHeroes", "heroes", "values", "checkResult", "adminPermissions"]);
const booleanFields = new Set(["enabled", "signupClosed", "voiceAvailable", "primaryAdmin", "autoReview"]);
const MAX_MEDIA_BYTES = 128 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function normalizeRow(row: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (value !== null && dates.has(key))
        return [key, new Date(value as string).toISOString()];
      if (value !== null && jsonFields.has(key))
        return [key, typeof value === "string" ? JSON.parse(value) : value];
      if (value !== null && booleanFields.has(key))
        return [key, Boolean(value)];
      return [key, value];
    }),
  );
}

export async function exportD1Snapshot(): Promise<BackupSnapshot> {
  const db = getD1();
  // JSON escaping can add up to six bytes per character. json_object measures
  // actual serialized metadata before SELECT materializes it in the Worker.
  const measurements = BACKUP_TABLES.map((table) => {
    const groups = [];
    for (let start = 0; start < columns[table].length; start += 16)
      groups.push(
        `json_object(${columns[table]
          .slice(start, start + 16)
          .flatMap((column) => [`'${column}'`, `"${column}"`])
          .join(",")})`,
      );
    const rowJson = groups.reduce(
      (left, right) => `json_patch(${left},${right})`,
    );
    return `(SELECT COALESCE(SUM(length(CAST(${rowJson} AS BLOB))),0) FROM "${table}")`;
  });
  const rowCounts = BACKUP_TABLES.map(
    (table) => `(SELECT COUNT(*) FROM "${table}")`,
  );
  const condition = `(${measurements.join("+")}) <= ? AND (${rowCounts.join("+")}) <= ? AND (SELECT COALESCE(SUM("byteSize"),0) FROM "SiteAsset") <= ?`;
  try {
    const result = await db.batch<Record<string, unknown>>([
      guardStatement(condition, [
        BACKUP_MAX_BYTES - 64 * 1024,
        BACKUP_MAX_ROWS,
        MAX_MEDIA_BYTES,
      ]),
      ...BACKUP_TABLES.map((table) =>
        db.prepare(
          `SELECT ${columns[table].map((column) => `"${column}"`).join(",")} FROM "${table}"`,
        ),
      ),
      clearGuards(),
    ]);
    return BACKUP_TABLES.map((table, index) => ({
      table,
      rows: result[index + 1].results.map((row) =>
        table === "SiteAsset"
          ? { ...normalizeRow(row), data: "" }
          : normalizeRow(row),
      ),
    }));
  } catch (error) {
    if (error instanceof Error && /CHECK constraint/i.test(error.message))
      throw new BackupError(
        "元数据（包含内嵌头像）超过 8 MB、媒体超过 128 MB 或数据超过 50,000 条，无法生成此 ZIP。没有省略任何数据。",
      );
    throw error;
  }
}

export async function readD1BackupAsset(
  storageKey: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!/^(assets|restores)\/[a-z0-9/]+$/.test(storageKey))
    throw new BackupError("备份图片存储标识无效。");
  const object = await getAssetBucket().get(storageKey);
  if (!object || object.size > MAX_IMAGE_BYTES)
    throw new BackupError("备份图片不存在或超过 2 MB，已停止备份。");
  return new Uint8Array(await object.arrayBuffer());
}

export async function writeD1RestoreAsset(
  data: Uint8Array,
  mimeType: string,
): Promise<string> {
  if (data.byteLength > MAX_IMAGE_BYTES)
    throw new BackupError("恢复图片超过 2 MB。");
  const key = `restores/${newDatabaseId()}/${newDatabaseId()}`;
  await getAssetBucket().put(key, data, {
    httpMetadata: { contentType: mimeType },
  });
  return key;
}

export async function deleteD1RestoreAssets(keys: string[]): Promise<void> {
  if (keys.some((key) => !/^restores\/[a-z0-9]+\/[a-z0-9]+$/.test(key)))
    throw new BackupError("恢复图片存储标识无效。");
  for (let offset = 0; offset < keys.length; offset += 1000)
    await getAssetBucket().delete(keys.slice(offset, offset + 1000));
}

export async function replaceD1Snapshot(
  snapshot: BackupSnapshot,
  actor: { adminId: string } | { setup: true },
) {
  if (
    snapshot.length !== BACKUP_TABLES.length ||
    new Set(snapshot.map((entry) => entry.table)).size !==
      BACKUP_TABLES.length ||
    snapshot.some(
      (entry) =>
        !BACKUP_TABLES.includes(entry.table as (typeof BACKUP_TABLES)[number]),
    )
  )
    throw new BackupError("恢复数据表不完整。");
  if (
    Buffer.byteLength(JSON.stringify(snapshot)) > BACKUP_MAX_BYTES ||
    snapshot.reduce((count, entry) => count + entry.rows.length, 0) >
      BACKUP_MAX_ROWS
  )
    throw new BackupError(
      "恢复元数据超过 8 MB 或 50,000 条记录，现有数据未改变。",
    );
  const db = getD1();
  const statements = [
    "setup" in actor && actor.setup
      ? guardStatement(
          `EXISTS (SELECT 1 FROM "AdminSetup" WHERE "id"='initial-admin' AND "completedAt" IS NULL) AND NOT EXISTS (SELECT 1 FROM "User" WHERE "role"='ADMIN')`,
        )
      : guardStatement(
          `EXISTS (SELECT 1 FROM "User" WHERE "id"=? AND "role"='ADMIN' AND "status"='APPROVED')`,
          ["adminId" in actor ? actor.adminId : ""],
        ),
  ];
  for (const table of [
    "Session",
    "OAuthState",
    "EventRegistration",
    "Article",
    "Profile",
    "OAuthAccount",
    "Event",
    "User",
    "AdminSetup",
    "OAuthConfig",
    "UpdateSettings",
    "AiSettings",
    "SiteSettings",
    "SiteAsset",
  ])
    statements.push(db.prepare(`DELETE FROM "${table}"`));
  for (const table of BACKUP_TABLES) {
    const fields = columns[table];
    const rows = snapshot
      .find((entry) => entry.table === table)!
      .rows.map((row) =>
        Object.fromEntries(
          fields.map((column) => {
            const value = row[column] ?? null;
            if (value !== null && dates.has(column))
              return [column, d1Date(new Date(value as string))];
            if (value !== null && jsonFields.has(column))
              return [column, JSON.stringify(value)];
            if (value !== null && booleanFields.has(column))
              return [column, value ? 1 : 0];
            return [column, value];
          }),
        ),
      );
    if (
      table === "SiteAsset" &&
      rows.some(
        (row) =>
          typeof row.storageKey !== "string" ||
          !/^restores\/[a-z0-9]+\/[a-z0-9]+$/.test(row.storageKey) ||
          !Number.isSafeInteger(row.byteSize) ||
          Number(row.byteSize) > MAX_IMAGE_BYTES,
      )
    )
      throw new BackupError("恢复图片尚未暂存完整，现有数据未改变。");
    let chunk: typeof rows = [],
      size = 2;
    const append = () => {
      if (!chunk.length) return;
      statements.push(
        db
          .prepare(
            `INSERT INTO "${table}" (${fields.map((column) => `"${column}"`).join(",")}${table === "SiteAsset" ? ',"data"' : ""}) SELECT ${fields.map((column) => `json_extract(value,'$.${column}')`).join(",")}${table === "SiteAsset" ? ",X''" : ""} FROM json_each(?)`,
          )
          .bind(JSON.stringify(chunk)),
      );
      chunk = [];
      size = 2;
    };
    for (const row of rows) {
      const bytes = Buffer.byteLength(JSON.stringify(row)) + 1;
      if (bytes > 1_900_000)
        throw new BackupError(
          "单条数据超过 Cloudflare D1 上限，现有数据未改变。",
        );
      if (size + bytes > 1_900_000) append();
      chunk.push(row);
      size += bytes;
    }
    append();
  }
  statements.push(db.prepare('DELETE FROM "BackupTransfer"'), clearGuards());
  if (statements.length > 900)
    throw new BackupError(
      "本次恢复超出 Cloudflare D1 单次事务限制，现有数据未改变。",
    );
  await db.batch(statements);
}
