import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { canSetUpAdmin } from "@/lib/admin-setup";
import {
  hasPermission,
  isPrimaryAdmin,
  type AdminPermission,
} from "@/lib/admin-permissions";

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

export const getCurrentSession = cache(async () => {
  if (!isDatabaseConfigured()) {
    return null;
  }

  const token = (await cookies()).get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: tokenHash(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          primaryAdmin: true,
          adminPermissions: true,
          profile: {
            select: {
              displayName: true,
              avatarUrl: true,
              reviewStatus: true,
            },
          },
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session;
});

export const getCurrentUser = cache(async () => {
  return (await getCurrentSession())?.user ?? null;
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export const shouldOpenAdminSetup = cache(async () => {
  return !isDatabaseConfigured() || (await canSetUpAdmin(prisma));
});

export async function isAdminSetupOpen() {
  return isDatabaseConfigured() && (await shouldOpenAdminSetup());
}

export async function redirectIfAdminSetupOpen() {
  if (await shouldOpenAdminSetup()) {
    redirect("/admin/setup");
  }
}

export async function requireAdmin() {
  const [open, user] = await Promise.all([
    shouldOpenAdminSetup(),
    getCurrentUser(),
  ]);
  if (open) redirect("/admin/setup");
  if (!user) redirect("/login");
  if (user.role !== "ADMIN" || user.status !== "APPROVED") {
    redirect("/");
  }
  return user;
}

export async function requirePermission(permission: AdminPermission) {
  const user = await requireAdmin();
  if (!hasPermission(user, permission)) {
    redirect("/admin");
  }
  return user;
}

export async function requirePrimaryAdmin() {
  const user = await requireAdmin();
  if (!isPrimaryAdmin(user)) {
    redirect("/admin");
  }
  return user;
}

export function canJoinEvents(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  return (
    user?.status === "APPROVED" &&
    user.profile?.reviewStatus === "APPROVED"
  );
}
