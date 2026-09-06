import { randomBytes } from "node:crypto";
import { getD1 } from "@/lib/cloudflare";

export const newDatabaseId = () => "c" + randomBytes(12).toString("hex");
// Match PrismaD1's canonical DateTime representation for indexed comparisons.
export const d1Date = (date = new Date()) =>
  date.toISOString().replace("Z", "+00:00");

export function guardStatement(condition: string, parameters: unknown[] = []) {
  return getD1()
    .prepare(
      `INSERT INTO "_AtomicGuard" ("id", "valid") VALUES (?, CASE WHEN ${condition} THEN 1 ELSE 0 END)`,
    )
    .bind(newDatabaseId(), ...parameters);
}

export function clearGuards() {
  return getD1().prepare('DELETE FROM "_AtomicGuard"');
}

export async function createD1User(input: {
  username: string;
  passwordHash: string;
  displayName: string;
  slogan: string;
  initialAdmin?: boolean;
}) {
  const db = getD1(),
    id = newDatabaseId(),
    now = d1Date();
  const statements = [];
  if (input.initialAdmin)
    statements.push(
      guardStatement(
        `EXISTS (SELECT 1 FROM "AdminSetup" WHERE "id" = 'initial-admin' AND "completedAt" IS NULL) AND NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN')`,
      ),
    );
  statements.push(
    db
      .prepare(
        'INSERT INTO "User" ("id","username","passwordHash","role","status","primaryAdmin","adminPermissions","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?)',
      )
      .bind(
        id,
        input.username,
        input.passwordHash,
        input.initialAdmin ? "ADMIN" : "USER",
        input.initialAdmin ? "APPROVED" : "PENDING",
        input.initialAdmin ? 1 : 0,
        "[]",
        now,
        now,
      ),
  );
  statements.push(
    db
      .prepare(
        'INSERT INTO "Profile" ("id","userId","displayName","slogan","reviewStatus","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?)',
      )
      .bind(
        newDatabaseId(),
        id,
        input.displayName,
        input.slogan,
        input.initialAdmin ? "APPROVED" : "PENDING",
        now,
        now,
      ),
  );
  if (input.initialAdmin)
    statements.push(
      db
        .prepare('UPDATE "AdminSetup" SET "completedAt"=? WHERE "id"=?')
        .bind(now, "initial-admin"),
      clearGuards(),
    );
  await db.batch(statements);
  return { id };
}

export async function reviewD1Profile(
  profileId: string,
  status: "APPROVED" | "REJECTED",
  note: string | null,
  adminId: string | null,
) {
  const db = getD1(),
    now = d1Date();
  await db.batch([
    guardStatement('EXISTS (SELECT 1 FROM "Profile" WHERE "id"=?)', [
      profileId,
    ]),
    db
      .prepare(
        'UPDATE "Profile" SET "reviewStatus"=?,"reviewNote"=?,"reviewedById"=?,"reviewedAt"=?,"updatedAt"=? WHERE "id"=?',
      )
      .bind(status, note, adminId, now, now, profileId),
    db
      .prepare(
        `UPDATE "User" SET "status"=?,"updatedAt"=? WHERE "id"=(SELECT "userId" FROM "Profile" WHERE "id"=?) AND "role"!='ADMIN'`,
      )
      .bind(status, now, profileId),
    clearGuards(),
  ]);
}

export async function reviewD1Registration(
  registrationId: string,
  eventId: string,
  decision: "APPROVED" | "REJECTED",
  adminId: string,
) {
  const db = getD1(),
    now = d1Date();
  const results = await db.batch([
    db
      .prepare(
        `UPDATE "EventRegistration" SET "status"=?,"reviewedById"=?,"reviewedAt"=?,"updatedAt"=? WHERE "id"=? AND "eventId"=? AND "status"!='CANCELLED' AND (?='REJECTED' OR "status"='APPROVED' OR (SELECT COUNT(*) FROM "EventRegistration" WHERE "eventId"=? AND "status"='APPROVED') < (SELECT "maxParticipants" FROM "Event" WHERE "id"=?))`,
      )
      .bind(
        decision,
        adminId,
        now,
        now,
        registrationId,
        eventId,
        decision,
        eventId,
        eventId,
      ),
    db
      .prepare(
        'SELECT "id" FROM "EventRegistration" WHERE "id"=? AND "eventId"=? AND "status"!=?',
      )
      .bind(registrationId, eventId, "CANCELLED"),
  ]);
  return results[0].meta.changes
    ? "saved"
    : results[1].results.length
      ? "full"
      : "registration";
}

export async function syncD1EventStatuses(
  today: Date,
  tomorrow: Date,
  now: Date,
) {
  const db = getD1();
  const results = await db.batch([
    db
      .prepare(
        `UPDATE "Event" SET "status"='FINISHED',"updatedAt"=? WHERE "status" IN ('OPEN','CLOSED','RUNNING') AND "startTime"<?`,
      )
      .bind(d1Date(now), d1Date(today)),
    db
      .prepare(
        `UPDATE "Event" SET "status"='RUNNING',"updatedAt"=? WHERE "status" IN ('OPEN','CLOSED','FINISHED') AND "startTime">=? AND "startTime"<?`,
      )
      .bind(d1Date(now), d1Date(today), d1Date(tomorrow)),
    db
      .prepare(
        `UPDATE "Event" SET "status"='CLOSED',"updatedAt"=? WHERE "status"='OPEN' AND "startTime">=? AND "signupDeadline"<?`,
      )
      .bind(d1Date(now), d1Date(tomorrow), d1Date(now)),
  ]);
  return {
    finished: results[0].meta.changes,
    running: results[1].meta.changes,
    closed: results[2].meta.changes,
  };
}
