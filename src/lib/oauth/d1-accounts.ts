import { randomBytes } from "node:crypto";
import { getD1 } from "@/lib/cloudflare";
import {
  clearGuards,
  d1Date,
  guardStatement,
  newDatabaseId,
} from "@/lib/d1-atomic";
import type { OAuthIdentity } from "./providers";
import type { OAuthProvider } from "./shared";
import { OAuthError } from "./accounts";

type AccountRow = { userId: string; role: "USER" | "ADMIN"; status: string };

export async function finishD1OAuthAccount(
  provider: OAuthProvider,
  revision: number,
  identity: OAuthIdentity,
  linkUserId: string | null,
  retry = true,
): Promise<{ user: { id: string; role: "USER" | "ADMIN" }; created: boolean }> {
  const db = getD1();
  const active = db
    .prepare(
      'SELECT "provider" FROM "OAuthConfig" WHERE "provider"=? AND "enabled"=1 AND "revision"=?',
    )
    .bind(provider, revision);
  const accountQuery = db
    .prepare(
      'SELECT a."userId",u."role",u."status" FROM "OAuthAccount" a JOIN "User" u ON u."id"=a."userId" WHERE a."provider"=? AND a."providerAccountId"=?',
    )
    .bind(provider, identity.accountId);
  const [configResult, accountResult] = await db.batch([active, accountQuery]);
  if (!configResult.results.length) throw new OAuthError("disabled");
  const account = accountResult.results[0] as AccountRow | undefined;
  if (account) {
    if (linkUserId && account.userId !== linkUserId)
      throw new OAuthError("conflict");
    if (account.status === "BANNED") throw new OAuthError("banned");
    return { user: { id: account.userId, role: account.role }, created: false };
  }
  const configGuard = guardStatement(
    'EXISTS (SELECT 1 FROM "OAuthConfig" WHERE "provider"=? AND "enabled"=1 AND "revision"=?)',
    [provider, revision],
  );
  const now = d1Date();
  try {
    if (linkUserId) {
      const result = await db.batch([
        configGuard,
        guardStatement(
          `EXISTS (SELECT 1 FROM "User" WHERE "id"=? AND "status"!='BANNED')`,
          [linkUserId],
        ),
        db
          .prepare(
            'INSERT INTO "OAuthAccount" ("id","userId","provider","providerAccountId","email","createdAt") VALUES (?,?,?,?,?,?)',
          )
          .bind(
            newDatabaseId(),
            linkUserId,
            provider,
            identity.accountId,
            identity.email,
            now,
          ),
        db
          .prepare('SELECT "id","role" FROM "User" WHERE "id"=?')
          .bind(linkUserId),
        clearGuards(),
      ]);
      return {
        user: result[3].results[0] as { id: string; role: "USER" | "ADMIN" },
        created: false,
      };
    }
    const id = newDatabaseId(),
      name = identity.name.trim().slice(0, 20);
    await db.batch([
      configGuard,
      db
        .prepare(
          `INSERT INTO "User" ("id","username","passwordHash","role","status","createdAt","updatedAt") VALUES (?,?,NULL,'USER','PENDING',?,?)`,
        )
        .bind(id, `${provider}_${randomBytes(8).toString("hex")}`, now, now),
      db
        .prepare(
          `INSERT INTO "Profile" ("id","userId","displayName","avatarUrl","slogan","reviewStatus","createdAt","updatedAt") VALUES (?,?,?,?,?,'PENDING',?,?)`,
        )
        .bind(
          newDatabaseId(),
          id,
          name.length >= 2 ? name : "新玩家",
          identity.avatarUrl,
          "刚加入社区，请多关照。",
          now,
          now,
        ),
      db
        .prepare(
          'INSERT INTO "OAuthAccount" ("id","userId","provider","providerAccountId","email","createdAt") VALUES (?,?,?,?,?,?)',
        )
        .bind(
          newDatabaseId(),
          id,
          provider,
          identity.accountId,
          identity.email,
          now,
        ),
      clearGuards(),
    ]);
    return { user: { id, role: "USER" }, created: true };
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint/i.test(error.message)) {
      // A simultaneous callback may have created the account. Re-read once;
      // never leave the losing callback's user or profile behind.
      if (retry)
        return finishD1OAuthAccount(
          provider,
          revision,
          identity,
          linkUserId,
          false,
        );
      throw new OAuthError("conflict");
    }
    if (error instanceof Error && /CHECK constraint/i.test(error.message)) {
      const config = await active.first();
      throw new OAuthError(config ? "session" : "disabled");
    }
    throw error;
  }
}
