import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" });
const prisma = new PrismaClient({ adapter });

async function main() {
  const username = process.env.ADMIN_USERNAME ?? "admin";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      role: "ADMIN",
      status: "APPROVED",
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
      profile: {
        create: {
          displayName: "活动管理员",
          slogan: "把今晚的车开稳。",
          reviewStatus: "APPROVED",
        },
      },
    },
  });

  const existingEvent = await prisma.event.findFirst({
    where: { title: "周末内战" },
  });

  if (!existingEvent) {
    const startTime = new Date();
    startTime.setDate(startTime.getDate() + 6);
    startTime.setHours(20, 30, 0, 0);

    const signupDeadline = new Date(startTime);
    signupDeadline.setHours(18, 0, 0, 0);

    await prisma.event.create({
      data: {
        title: "周末内战",
        description: "轻松组队，按报名位置做基础平衡，优先照顾能全程语音的玩家。",
        type: "SCRIM",
        startTime,
        signupDeadline,
        maxParticipants: 12,
        requirements: "资料审核通过后可报名。",
        voiceChannel: "活动开始前由管理员通知。",
        status: "OPEN",
        createdById: admin.id,
      },
    });
  }

  console.log(`Seeded admin account: ${username}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log("Default password: ChangeMe123!  Change it after first login.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
