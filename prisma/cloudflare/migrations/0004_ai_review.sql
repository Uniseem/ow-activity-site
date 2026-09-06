CREATE TABLE "AiSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "preset" TEXT NOT NULL DEFAULT 'openai',
    "baseUrl" TEXT NOT NULL DEFAULT '',
    "encryptedApiKey" TEXT,
    "model" TEXT NOT NULL DEFAULT '',
    "autoReview" INTEGER NOT NULL DEFAULT 0,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "AiSettings" ("id", "preset", "baseUrl", "model", "autoReview", "revision", "updatedAt")
VALUES ('review', 'openai', '', '', 0, 0, CURRENT_TIMESTAMP);
