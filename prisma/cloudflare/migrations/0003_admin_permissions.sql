ALTER TABLE "User" ADD COLUMN "primaryAdmin" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "adminPermissions" JSONB NOT NULL DEFAULT '[]';

UPDATE "User"
SET "adminPermissions" = '["events","articles","users","customize","oauth","updates","backup","ai"]'
WHERE "role" = 'ADMIN';

UPDATE "User"
SET "primaryAdmin" = 1
WHERE "id" = (
  SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1
);

CREATE UNIQUE INDEX "User_one_primary_admin" ON "User" ("primaryAdmin") WHERE "primaryAdmin" = 1;
