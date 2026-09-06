-- CreateTable
CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL,
    "preset" TEXT NOT NULL DEFAULT 'openai',
    "baseUrl" TEXT NOT NULL DEFAULT '',
    "encryptedApiKey" TEXT,
    "model" TEXT NOT NULL DEFAULT '',
    "autoReview" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AiSettings" ("id", "preset", "baseUrl", "model", "autoReview", "revision", "updatedAt")
VALUES ('review', 'openai', '', '', false, 0, CURRENT_TIMESTAMP);
