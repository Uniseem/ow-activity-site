import {
  CalendarDays,
  ClipboardCheck,
  Clock,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();

  const [pendingProfiles, pendingRegistrations, openEvents, totalUsers] =
    await Promise.all([
      prisma.profile.count({ where: { reviewStatus: "PENDING" } }),
      prisma.eventRegistration.count({ where: { status: "PENDING" } }),
      prisma.event.count({ where: { status: "OPEN" } }),
      prisma.user.count(),
    ]);

  return (
    <main className="page-shell grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-black">管理后台</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--orange)] px-4 py-2 text-sm font-black text-white hover:bg-[#dd6815]"
        >
          <Plus className="h-4 w-4" />
          创建活动
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Clock />} label="待审资料" value={pendingProfiles} />
        <Metric
          icon={<ClipboardCheck />}
          label="待审报名"
          value={pendingRegistrations}
        />
        <Metric icon={<CalendarDays />} label="报名中活动" value={openEvents} />
        <Metric icon={<Users />} label="注册用户" value={totalUsers} />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <AdminLink
          href="/admin/users"
          title="用户与资料审核"
          description="查看注册用户、审核公开资料、封禁不合适账号。"
        />
        <AdminLink
          href="/admin/events"
          title="活动与报名管理"
          description="创建活动、编辑状态、处理玩家报名。"
        />
      </section>
    </main>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactElement;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
      <div className="mb-4 inline-flex rounded-md bg-[#f5f7fb] p-2 text-[var(--teal)]">
        {icon}
      </div>
      <p className="text-sm font-bold text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function AdminLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="focus-ring rounded-md border border-black/10 bg-white p-5 shadow-sm hover:border-[var(--teal)]"
    >
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        {description}
      </p>
    </Link>
  );
}
