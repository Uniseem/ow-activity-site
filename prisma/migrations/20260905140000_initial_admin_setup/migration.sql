CREATE TABLE "AdminSetup" (
    "id" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AdminSetup_pkey" PRIMARY KEY ("id")
);

-- 已有管理员的站点保持关闭，只有尚未初始化的站点开放首次注册。
INSERT INTO "AdminSetup" ("id", "completedAt")
SELECT 'initial-admin', CASE
    WHEN EXISTS (SELECT 1 FROM "User" WHERE "role" = 'ADMIN')
    THEN CURRENT_TIMESTAMP
    ELSE NULL
END;
