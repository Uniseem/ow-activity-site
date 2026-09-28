CREATE TABLE "UpdateSettings" (
  "id" TEXT NOT NULL,
  "repositoryUrl" TEXT NOT NULL DEFAULT 'https://github.com/Uniseem/ow-activity-site',
  "branch" TEXT NOT NULL DEFAULT '',
  "encryptedDeployHook" TEXT,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "checkKey" TEXT,
  "checkResult" JSONB,
  "checkedAt" TIMESTAMP(3),
  "checkLease" TEXT,
  "checkLeaseUntil" TIMESTAMP(3),
  "deployRequestedAt" TIMESTAMP(3),
  "deployRequestedSha" TEXT,
  "deployJobId" TEXT,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UpdateSettings_pkey" PRIMARY KEY ("id")
);
INSERT INTO "UpdateSettings" ("id") VALUES ('global');
