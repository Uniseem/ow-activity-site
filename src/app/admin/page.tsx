import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  FilePenLine,
  Users,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ButtonLink, Card, Chip } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncEventStatuses } from "@/lib/event-schedule";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  await requireAdmin();
  await syncEventStatuses();
  const [pendingProfiles, pendingRegistrations, openEvents, draftArticles] =
    await Promise.all([
      prisma.profile.count({ where: { reviewStatus: "PENDING" } }),
      prisma.eventRegistration.count({ where: { status: "PENDING" } }),
      prisma.event.count({ where: { status: { in: ["OPEN", "RUNNING"] } } }),
      prisma.article.count({ where: { status: "DRAFT" } }),
    ]);
  return (
    <main className="page-shell">
      <PageHeading title="工作台" description="待办和常用操作。" />
      <Card className="gap-0 p-0">
        <div className="border-b border-border px-6 py-5">
          <h2 className="section-title">待处理</h2>
          <p className="mt-1 text-sm text-muted">
            {pendingProfiles + pendingRegistrations
              ? "处理审核后，玩家会在个人页面看到结果。"
              : "当前没有待审核申请。"}
          </p>
        </div>
        {[
          {
            icon: Users,
            title: "玩家资料审核",
            count: pendingProfiles,
            href: "/admin/users?status=PENDING",
          },
          {
            icon: ClipboardCheck,
            title: "活动报名审核",
            count: pendingRegistrations,
            href: "/admin/events?filter=review",
          },
        ].map(({ icon: Icon, title, count, href }) => (
          <div
            key={href}
            className="flex items-center justify-between gap-4 border-b border-border px-6 py-5 last:border-0"
          >
            <div className="flex items-center gap-3">
              <Icon size={19} className="text-muted" />
              <span className="font-medium">{title}</span>
              <Chip
                size="sm"
                color={count ? "warning" : "default"}
                variant="soft"
              >
                {count}
              </Chip>
            </div>
            <ButtonLink
              href={href}
              variant={count ? "primary" : "secondary"}
              size="sm"
            >
              {count ? "去审核" : "查看"}
              <ArrowRight size={14} />
            </ButtonLink>
          </div>
        ))}
      </Card>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          {
            icon: CalendarDays,
            title: "活动",
            description: `${openEvents} 场活动正在报名或进行中`,
            href: "/admin/events",
            create: "/admin/events/new",
            label: "创建活动",
          },
          {
            icon: FilePenLine,
            title: "文章",
            description: `${draftArticles} 篇草稿尚未发布`,
            href: "/admin/articles",
            create: "/admin/articles/new",
            label: "写文章",
          },
        ].map(({ icon: Icon, title, description, href, create, label }) => (
          <Card
            key={href}
            className="gap-5 p-6"
          >
            <div className="flex items-center gap-3">
              <Icon size={19} />
              <h2 className="section-title">{title}</h2>
            </div>
            <p className="text-sm text-muted">{description}</p>
            <div className="flex gap-2">
              <ButtonLink href={create} variant="secondary" size="sm">
                {label}
              </ButtonLink>
              <ButtonLink href={href} variant="ghost" size="sm">
                查看全部
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>
    </main>
  );
}
