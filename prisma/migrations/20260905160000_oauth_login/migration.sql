CREATE TYPE "OAuthProvider" AS ENUM ('google', 'github');
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;
CREATE TABLE "OAuthConfig" (
    "provider" "OAuthProvider" NOT NULL,
    "clientId" TEXT NOT NULL DEFAULT '',
    "encryptedSecret" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OAuthConfig_pkey" PRIMARY KEY ("provider")
);
INSERT INTO "OAuthConfig" ("provider", "updatedAt") VALUES ('google', NOW()), ('github', NOW());
CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");
CREATE UNIQUE INDEX "OAuthAccount_userId_provider_key" ON "OAuthAccount"("userId", "provider");
CREATE TABLE "OAuthState" (
    "stateHash" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("stateHash")
);
CREATE INDEX "OAuthState_expiresAt_idx" ON "OAuthState"("expiresAt");
