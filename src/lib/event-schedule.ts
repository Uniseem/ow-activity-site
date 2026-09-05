import "server-only";
import { cache } from "react";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { shanghaiDayBounds } from "@/lib/event-date";
import { isD1Database } from "@/lib/database-provider";
import { syncD1EventStatuses } from "@/lib/d1-atomic";

// 同一请求只同步一次；定时任务和读取页面使用相同的上海日期边界。
export const syncEventStatuses = cache(async (now = new Date()) => {
  if (!isDatabaseConfigured()) return { finished: 0, running: 0, closed: 0 };
  const { today, tomorrow } = shanghaiDayBounds(now);
  if (isD1Database()) return syncD1EventStatuses(today, tomorrow, now);
  const [finished, running, closed] = await prisma.$transaction([
    prisma.event.updateMany({
      where: {
        status: { in: ["OPEN", "CLOSED", "RUNNING"] },
        startTime: { lt: today },
      },
      data: { status: "FINISHED" },
    }),
    prisma.event.updateMany({
      where: {
        status: { in: ["OPEN", "CLOSED", "FINISHED"] },
        startTime: { gte: today, lt: tomorrow },
      },
      data: { status: "RUNNING" },
    }),
    prisma.event.updateMany({
      where: {
        status: "OPEN",
        startTime: { gte: tomorrow },
        signupDeadline: { lt: now },
      },
      data: { status: "CLOSED" },
    }),
  ]);
  return {
    finished: finished.count,
    running: running.count,
    closed: closed.count,
  };
});
