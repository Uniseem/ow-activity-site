BEGIN;

ALTER TABLE "Event" ADD COLUMN "customType" TEXT;
ALTER TABLE "Event" ADD COLUMN "signupClosed" BOOLEAN NOT NULL DEFAULT false;
UPDATE "Event" SET "signupClosed" = true WHERE "status" = 'CLOSED';
-- 保留旧活动的类型名称，将移除的选项转为自定义类型。
UPDATE "Event" SET "customType" = CASE "type"::text
  WHEN 'COMPETITIVE' THEN '竞技组队' WHEN 'OTHER' THEN '其他' ELSE '自定义' END
WHERE "type" IN ('CUSTOM', 'COMPETITIVE', 'OTHER');
UPDATE "Event" SET "type" = 'CUSTOM' WHERE "type" IN ('COMPETITIVE', 'OTHER');

ALTER TYPE "EventType" RENAME TO "EventType_old";
CREATE TYPE "EventType" AS ENUM ('SCRIM', 'FUN', 'TRAINING', 'WATCH', 'CUSTOM');
ALTER TABLE "Event" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "type" TYPE "EventType" USING "type"::text::"EventType";
ALTER TABLE "Event" ALTER COLUMN "type" SET DEFAULT 'FUN';
DROP TYPE "EventType_old";

-- 原时间戳按上海日期保留：活动从当天零点开始，报名截止于当日末尾。
UPDATE "Event" SET
  "startTime" = date_trunc('day', ("startTime" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai') - INTERVAL '8 hours',
  "signupDeadline" = CASE WHEN "signupDeadline" IS NULL THEN NULL ELSE
    date_trunc('day', ("signupDeadline" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Shanghai') + INTERVAL '16 hours' - INTERVAL '1 millisecond' END;

COMMIT;
