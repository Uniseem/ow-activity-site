CREATE TABLE "BackupTransfer" (
  "id" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "manifest" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BackupTransfer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "BackupChunk" (
  "id" TEXT NOT NULL,
  "transferId" TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  "data" TEXT NOT NULL,
  CONSTRAINT "BackupChunk_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "BackupTransfer_expiresAt_idx" ON "BackupTransfer"("expiresAt");
CREATE INDEX "BackupTransfer_ownerId_idx" ON "BackupTransfer"("ownerId");
CREATE UNIQUE INDEX "BackupChunk_transferId_index_key" ON "BackupChunk"("transferId", "index");
ALTER TABLE "BackupChunk" ADD CONSTRAINT "BackupChunk_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "BackupTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
