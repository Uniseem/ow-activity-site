-- AlterTable
ALTER TABLE "User" ADD COLUMN "primaryAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "adminPermissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Existing administrators keep access. The earliest admin stays the primary.
UPDATE "User"
SET "adminPermissions" = ARRAY['events', 'articles', 'users', 'customize', 'oauth', 'updates', 'backup', 'ai']
WHERE "role" = 'ADMIN';

UPDATE "User"
SET "primaryAdmin" = true
WHERE "id" = (
  SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1
);

CREATE UNIQUE INDEX "User_one_primary_admin" ON "User" ("primaryAdmin") WHERE "primaryAdmin";
