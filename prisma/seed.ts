import "../env.config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

let prisma: PrismaClient | undefined;

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD;
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED?.trim() ||
    process.env.DATABASE_URL?.trim();

  if (!connectionString) {
    throw new Error("请先设置 DATABASE_URL，再初始化管理员。");
  }
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
    throw new Error("ADMIN_USERNAME 必须是 3–24 位字母、数字或下划线。");
  }
  if (
    !password ||
    password.trim() !== password ||
    password.length < 8 ||
    Buffer.byteLength(password, "utf8") > 72
  ) {
    throw new Error(
      "请设置 ADMIN_PASSWORD：至少 8 个字符、最多 72 字节，首尾不能有空白。",
    );
  }

  prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction(async (tx) => {
    // 与网页首次注册使用同一条记录，避免两个入口并发初始化。
    await tx.adminSetup.update({
      where: { id: "initial-admin" },
      data: { completedAt: new Date() },
    });
    await tx.user.upsert({
      where: { username },
      update: {
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
        primaryAdmin: true,
        adminPermissions: [],
        profile: {
          upsert: {
            create: {
              displayName: "活动管理员",
              slogan: "把今晚的车开稳。",
              reviewStatus: "APPROVED",
            },
            update: {
              displayName: "活动管理员",
              reviewStatus: "APPROVED",
            },
          },
        },
      },
      create: {
        username,
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
        primaryAdmin: true,
        adminPermissions: [],
        profile: {
          create: {
            displayName: "活动管理员",
            slogan: "把今晚的车开稳。",
            reviewStatus: "APPROVED",
          },
        },
      },
    });
  });

  console.log(`Seeded admin account: ${username}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
