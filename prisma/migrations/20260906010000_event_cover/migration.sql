-- 每场活动可设置独立封面，现有活动保持空值并使用默认展示。
ALTER TABLE "Event" ADD COLUMN "coverUrl" TEXT NOT NULL DEFAULT '';
