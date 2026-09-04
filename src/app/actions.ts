"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  canJoinEvents,
  createSession,
  destroySession,
  requireAdmin,
  requireUser,
} from "@/lib/auth";
import { avatarFileToDataUrl } from "@/lib/avatar-upload";
import { assertDatabaseConfigured, prisma } from "@/lib/prisma";

export type FormState = {
  message: string;
  errors?: Record<string, string[] | undefined>;
};

const emptyState: FormState = { message: "" };

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function list(value: string) {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function playerRole(value: string) {
  return ["TANK", "DAMAGE", "SUPPORT", "FLEX"].includes(value)
    ? (value as "TANK" | "DAMAGE" | "SUPPORT" | "FLEX")
    : null;
}

function parseDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function databaseErrorState(error: unknown): FormState {
  if (error instanceof Error && error.message.includes("数据库还没有配置")) {
    return { message: error.message };
  }

  return { message: "操作失败，请稍后再试。" };
}

const registerSchema = z.object({
  username: z
    .string()
    .min(3, "用户名至少 3 位")
    .max(24, "用户名最多 24 位")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  password: z
    .string()
    .min(8, "密码至少 8 位")
    .max(72, "密码最多 72 位"),
  displayName: z
    .string()
    .min(2, "昵称至少 2 位")
    .max(20, "昵称最多 20 位"),
  slogan: z.string().max(80, "宣言最多 80 字"),
});

export async function registerAction(
  _prevState: FormState = emptyState,
  formData: FormData,
): Promise<FormState> {
  void _prevState;

  const parsed = registerSchema.safeParse({
    username: text(formData, "username"),
    password: text(formData, "password"),
    displayName: text(formData, "displayName"),
    slogan: text(formData, "slogan"),
  });

  if (!parsed.success) {
    return {
      message: "请检查注册信息。",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    assertDatabaseConfigured();

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        profile: {
          create: {
            displayName: parsed.data.displayName,
            slogan: parsed.data.slogan,
            reviewStatus: "PENDING",
          },
        },
      },
    });

    await createSession(user.id);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { message: "这个用户名已经被注册。" };
    }

    return databaseErrorState(error);
  }

  redirect("/me?registered=1");
}

const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

export async function loginAction(
  _prevState: FormState = emptyState,
  formData: FormData,
): Promise<FormState> {
  void _prevState;

  const parsed = loginSchema.safeParse({
    username: text(formData, "username"),
    password: text(formData, "password"),
  });

  if (!parsed.success) {
    return {
      message: "请填写用户名和密码。",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  let target = "/me";

  try {
    assertDatabaseConfigured();

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username },
      include: { profile: true },
    });

    if (!user || user.status === "BANNED") {
      return { message: "用户名或密码不正确。" };
    }

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      return { message: "用户名或密码不正确。" };
    }

    await createSession(user.id);
    target = user.role === "ADMIN" ? "/admin" : "/me";
  } catch (error) {
    return databaseErrorState(error);
  }

  redirect(target);
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "昵称至少 2 位")
    .max(20, "昵称最多 20 位"),
  slogan: z.string().max(80, "宣言最多 80 字"),
  avatarUrl: z.string().url("头像必须是有效链接").or(z.literal("")),
  battleTag: z.string().max(60, "战网 ID 过长"),
  mainRole: z.enum(["TANK", "DAMAGE", "SUPPORT", "FLEX"]).or(z.literal("")),
  mainHeroes: z.string().max(120, "常用英雄列表过长"),
  rank: z.string().max(40, "段位过长"),
  onlineTime: z.string().max(80, "在线时间过长"),
  contact: z.string().max(120, "联系方式过长"),
  extraNote: z.string().max(300, "备注最多 300 字"),
});

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();
  const avatarFile = formData.get("avatarFile");

  const parsed = profileSchema.safeParse({
    displayName: text(formData, "displayName"),
    slogan: text(formData, "slogan"),
    avatarUrl: text(formData, "avatarUrl"),
    battleTag: text(formData, "battleTag"),
    mainRole: text(formData, "mainRole"),
    mainHeroes: text(formData, "mainHeroes"),
    rank: text(formData, "rank"),
    onlineTime: text(formData, "onlineTime"),
    contact: text(formData, "contact"),
    extraNote: text(formData, "extraNote"),
  });

  if (!parsed.success) {
    redirect("/me?error=profile");
  }

  let avatarUrl = parsed.data.avatarUrl || user.profile?.avatarUrl || null;

  if (checkbox(formData, "removeAvatar")) {
    avatarUrl = null;
  }

  if (avatarFile instanceof File && avatarFile.size > 0) {
    try {
      avatarUrl = await avatarFileToDataUrl(avatarFile);
    } catch (error) {
      const code = error instanceof Error ? error.message : "avatar-type";
      redirect(`/me?error=${code}`);
    }
  }

  const reviewStatus = user.role === "ADMIN" ? "APPROVED" : "PENDING";

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: parsed.data.displayName,
      slogan: parsed.data.slogan,
      avatarUrl,
      battleTag: parsed.data.battleTag || null,
      mainRole: parsed.data.mainRole || null,
      mainHeroes: list(parsed.data.mainHeroes),
      rank: parsed.data.rank || null,
      onlineTime: parsed.data.onlineTime || null,
      contact: parsed.data.contact || null,
      extraNote: parsed.data.extraNote || null,
      reviewStatus,
    },
    update: {
      displayName: parsed.data.displayName,
      slogan: parsed.data.slogan,
      avatarUrl,
      battleTag: parsed.data.battleTag || null,
      mainRole: parsed.data.mainRole || null,
      mainHeroes: list(parsed.data.mainHeroes),
      rank: parsed.data.rank || null,
      onlineTime: parsed.data.onlineTime || null,
      contact: parsed.data.contact || null,
      extraNote: parsed.data.extraNote || null,
      reviewStatus,
      reviewNote: null,
      reviewedById: null,
      reviewedAt: null,
    },
  });

  if (user.role !== "ADMIN" && user.status !== "APPROVED") {
    await prisma.user.update({
      where: { id: user.id },
      data: { status: "PENDING" },
    });
  }

  revalidatePath("/");
  revalidatePath("/players");
  revalidatePath("/me");
  redirect("/me?saved=profile");
}

export async function reviewProfileAction(formData: FormData) {
  const admin = await requireAdmin();
  const profileId = text(formData, "profileId");
  const decision = text(formData, "decision");
  const note = text(formData, "reviewNote");

  if (!profileId || !["APPROVED", "REJECTED"].includes(decision)) {
    redirect("/admin/users");
  }

  const approved = decision === "APPROVED";
  const profileStatus = approved ? ("APPROVED" as const) : ("REJECTED" as const);
  const userStatus = approved ? ("APPROVED" as const) : ("REJECTED" as const);

  await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.update({
      where: { id: profileId },
      data: {
        reviewStatus: profileStatus,
        reviewNote: note || null,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
      select: { userId: true },
    });

    await tx.user.update({
      where: { id: profile.userId },
      data: { status: userStatus },
    });
  });

  revalidatePath("/");
  revalidatePath("/players");
  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function updateUserStatusAction(formData: FormData) {
  await requireAdmin();
  const userId = text(formData, "userId");
  const status = text(formData, "status");

  if (!userId || !["PENDING", "APPROVED", "REJECTED", "BANNED"].includes(status)) {
    redirect("/admin/users");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: status as "PENDING" | "APPROVED" | "REJECTED" | "BANNED" },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

const eventSchema = z.object({
  title: z.string().min(2).max(60),
  type: z.enum([
    "SCRIM",
    "FUN",
    "TRAINING",
    "CUSTOM",
    "COMPETITIVE",
    "WATCH",
    "OTHER",
  ]),
  description: z.string().min(6).max(1000),
  startTime: z.string().min(1),
  signupDeadline: z.string(),
  maxParticipants: z.coerce.number().int().min(2).max(60),
  requirements: z.string().max(500),
  voiceChannel: z.string().max(200),
  status: z.enum(["DRAFT", "OPEN", "CLOSED", "RUNNING", "FINISHED", "CANCELLED"]),
});

export async function createEventAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = eventSchema.safeParse({
    title: text(formData, "title"),
    type: text(formData, "type"),
    description: text(formData, "description"),
    startTime: text(formData, "startTime"),
    signupDeadline: text(formData, "signupDeadline"),
    maxParticipants: text(formData, "maxParticipants"),
    requirements: text(formData, "requirements"),
    voiceChannel: text(formData, "voiceChannel"),
    status: text(formData, "status"),
  });

  if (!parsed.success) {
    redirect("/admin/events/new?error=invalid");
  }

  const startTime = parseDateTime(parsed.data.startTime);
  const signupDeadline = parsed.data.signupDeadline
    ? parseDateTime(parsed.data.signupDeadline)
    : null;

  if (!startTime) {
    redirect("/admin/events/new?error=date");
  }

  const event = await prisma.event.create({
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description,
      startTime,
      signupDeadline,
      maxParticipants: parsed.data.maxParticipants,
      requirements: parsed.data.requirements || null,
      voiceChannel: parsed.data.voiceChannel || null,
      status: parsed.data.status,
      createdById: admin.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/events");
  redirect(`/admin/events/${event.id}`);
}

export async function updateEventAction(formData: FormData) {
  await requireAdmin();
  const eventId = text(formData, "eventId");
  const parsed = eventSchema.safeParse({
    title: text(formData, "title"),
    type: text(formData, "type"),
    description: text(formData, "description"),
    startTime: text(formData, "startTime"),
    signupDeadline: text(formData, "signupDeadline"),
    maxParticipants: text(formData, "maxParticipants"),
    requirements: text(formData, "requirements"),
    voiceChannel: text(formData, "voiceChannel"),
    status: text(formData, "status"),
  });

  if (!eventId || !parsed.success) {
    redirect("/admin/events?error=invalid");
  }

  const startTime = parseDateTime(parsed.data.startTime);
  const signupDeadline = parsed.data.signupDeadline
    ? parseDateTime(parsed.data.signupDeadline)
    : null;

  if (!startTime) {
    redirect(`/admin/events/${eventId}?error=date`);
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      description: parsed.data.description,
      startTime,
      signupDeadline,
      maxParticipants: parsed.data.maxParticipants,
      requirements: parsed.data.requirements || null,
      voiceChannel: parsed.data.voiceChannel || null,
      status: parsed.data.status,
    },
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  redirect(`/admin/events/${eventId}?saved=1`);
}

export async function registerEventAction(formData: FormData) {
  const user = await requireUser();
  const eventId = text(formData, "eventId");

  if (!eventId) {
    redirect("/events");
  }

  if (!canJoinEvents(user)) {
    redirect(`/events/${eventId}?error=profile`);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: {
        where: { status: "APPROVED" },
        select: { id: true },
      },
    },
  });

  if (!event || event.status !== "OPEN") {
    redirect(`/events/${eventId}?error=closed`);
  }

  if (event.signupDeadline && event.signupDeadline < new Date()) {
    redirect(`/events/${eventId}?error=deadline`);
  }

  if (event.registrations.length >= event.maxParticipants) {
    redirect(`/events/${eventId}?error=full`);
  }

  const existing = await prisma.eventRegistration.findUnique({
    where: {
      eventId_userId: {
        eventId,
        userId: user.id,
      },
    },
  });

  if (existing && existing.status !== "CANCELLED") {
    redirect(`/events/${eventId}?error=registered`);
  }

  const payload = {
    preferredRole: playerRole(text(formData, "preferredRole")),
    heroes: list(text(formData, "heroes")),
    voiceAvailable: checkbox(formData, "voiceAvailable"),
    note: text(formData, "note") || null,
    status: "PENDING" as const,
  };

  if (existing) {
    await prisma.eventRegistration.update({
      where: { id: existing.id },
      data: payload,
    });
  } else {
    await prisma.eventRegistration.create({
      data: {
        ...payload,
        eventId,
        userId: user.id,
      },
    });
  }

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?registered=1`);
}

export async function cancelRegistrationAction(formData: FormData) {
  const user = await requireUser();
  const eventId = text(formData, "eventId");

  if (!eventId) {
    redirect("/events");
  }

  await prisma.eventRegistration.updateMany({
    where: { eventId, userId: user.id },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/events/${eventId}`);
  redirect(`/events/${eventId}?cancelled=1`);
}

export async function reviewRegistrationAction(formData: FormData) {
  const admin = await requireAdmin();
  const registrationId = text(formData, "registrationId");
  const eventId = text(formData, "eventId");
  const decision = text(formData, "decision");

  if (!registrationId || !eventId || !["APPROVED", "REJECTED"].includes(decision)) {
    redirect("/admin/events");
  }

  if (decision === "APPROVED") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { maxParticipants: true },
    });
    const approvedCount = await prisma.eventRegistration.count({
      where: { eventId, status: "APPROVED" },
    });

    if (event && approvedCount >= event.maxParticipants) {
      redirect(`/admin/events/${eventId}?error=full`);
    }
  }

  await prisma.eventRegistration.update({
    where: { id: registrationId },
    data: {
      status: decision as "APPROVED" | "REJECTED",
      reviewedById: admin.id,
      reviewedAt: new Date(),
    },
  });

  revalidatePath("/");
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/events/${eventId}`);
}
