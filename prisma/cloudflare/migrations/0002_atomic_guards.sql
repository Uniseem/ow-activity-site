-- A failed guard aborts the entire D1 batch, including earlier statements.
CREATE TABLE "_AtomicGuard" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "valid" INTEGER NOT NULL CHECK ("valid" = 1)
);

-- Open the first-admin registration exactly once on a fresh installation.
INSERT INTO "AdminSetup" ("id", "completedAt") VALUES ('initial-admin', NULL);
