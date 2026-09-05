import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { canSetUpAdmin } from "@/lib/admin-setup";

export const SESSION_COOKIE = "ow_activity_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: tokenHash(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token && isDatabaseConfigured()) {
    await prisma.session.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentSession() {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session;
}

export async function getCurrentUser() {
  return (await getCurrentSession())?.user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  if (isDatabaseConfigured() && (await canSetUpAdmin(prisma))) {
    redirect("/admin/setup");
  }
  const user = await requireUser();

  if (user.role !== "ADMIN" || user.status !== "APPROVED") {
    redirect("/");
  }

  return user;
}

export function canJoinEvents(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return (
    user?.status === "APPROVED" &&
    user.profile?.reviewStatus === "APPROVED"
  );
}
