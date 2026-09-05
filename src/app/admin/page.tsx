import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Plus,
  Users,
} from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { PageHeading } from "@/components/page-heading";
import { ButtonLink, Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncEventStatuses } from "@/lib/event-schedule";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  await requireAdmin();
  await syncEventStatuses();
  const [pendingProfiles, pendingRegistrations, openEvents, totalUsers] =
    await Promise.all([
      prisma.profile.count({ where: { reviewStatus: "PENDING" } }),
      prisma.eventRegistration.count({ where: { status: "PENDING" } }),
      prisma.event.count({ where: { status: "OPEN" } }),
      prisma.user.count(),
    ]);
  const metrics = [
    {
      icon: Clock,
      label: "待审资料",
      value: pendingProfiles,
      href: "/admin/users",
    },
    {
      icon: ClipboardCheck,
      label: "待审报名",
      value: pendingRegistrations,
      href: "/admin/events",
    },
    {
      icon: CalendarDays,
      label: "报名中活动",
      value: openEvents,
      href: "/admin/events",
    },
    { icon: Users, label: "注册用户", value: totalUsers, href: "/admin/users" },
  ];
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Community management"
        title="管理后台"
        description="处理社区审核，让每一场活动顺利开始。"
        action={
          <ButtonLink href="/admin/events/new">
            <Plus size={17} />
            创建活动
          </ButtonLink>
        }
      />
      <AdminNav />
      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="社区概况"
      >
        {metrics.map(({ icon: Icon, label, value, href }) => (
          <Card
            key={label}
            className="gap-5 border border-border p-6 shadow-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{label}</span>
              <Icon size={18} className="text-accent" />
            </div>
            <p className="text-4xl font-semibold tabular-nums tracking-tight">
              {value}
            </p>
            <ButtonLink
              href={href}
              variant="ghost"
              size="sm"
              className="w-fit px-0"
            >
              查看详情
              <ArrowRight size={14} />
            </ButtonLink>
          </Card>
        ))}
      </section>
      <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="管理入口">
        {[
          {
            icon: Users,
            href: "/admin/users",
            title: "用户与资料审核",
            description: "查看玩家资料，处理审核申请，管理账号状态。",
          },
          {
            icon: CalendarDays,
            href: "/admin/events",
            title: "活动与报名管理",
            description: "发布新活动，调整活动安排，审核玩家报名。",
          },
        ].map(({ icon: Icon, href, title, description }) => (
          <Card
            key={href}
            className="gap-5 border border-border p-7 shadow-none"
          >
            <span className="icon-tile">
              <Icon size={22} />
            </span>
            <div>
              <h2 className="section-title">{title}</h2>
              <p className="mt-2 text-sm leading-7 text-muted">{description}</p>
            </div>
            <ButtonLink href={href} variant="secondary" className="w-fit">
              进入管理
              <ArrowRight size={15} />
            </ButtonLink>
          </Card>
        ))}
      </section>
    </main>
  );
}
