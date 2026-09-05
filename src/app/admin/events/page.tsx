import { Plus } from "lucide-react";
import { EmptyState, PageHeading } from "@/components/page-heading";
import {
  Button,
  ButtonLink,
  Card,
  Chip,
  InputField,
  StatusChip,
} from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncEventStatuses } from "@/lib/event-schedule";
import { formatEventDate } from "@/lib/event-date";
import { eventStatusLabels, eventTypeLabel } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  await syncEventStatuses();
  const query = searchParams ? await searchParams : {};
  const filter =
    typeof query.filter === "string" &&
    ["review", "active", "draft", "finished"].includes(query.filter)
      ? query.filter
      : "all";
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const where: Prisma.EventWhereInput = {
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    ...(filter === "review"
      ? { registrations: { some: { status: "PENDING" } } }
      : filter === "active"
        ? { status: { in: ["OPEN", "RUNNING", "CLOSED"] } }
        : filter === "draft"
          ? { status: "DRAFT" }
          : filter === "finished"
            ? { status: { in: ["FINISHED", "CANCELLED"] } }
            : {}),
  };
  const total = await prisma.event.count({ where });
  const page = Math.min(
    Math.max(1, Math.floor(Number(query.page) || 1)),
    Math.max(1, Math.ceil(total / 20)),
  );
  const events = await prisma.event.findMany({
    where,
    orderBy: { startTime: "desc" },
    skip: (page - 1) * 20,
    take: 20,
    include: { registrations: { select: { status: true } } },
  });
  function href(nextFilter: string, nextPage = 1) {
    return (
      "/admin/events?" +
      new URLSearchParams({ filter: nextFilter, q, page: String(nextPage) })
    );
  }
  return (
    <main className="page-shell">
      <PageHeading
        title="活动管理"
        description="查看活动状态，处理报名和修改活动安排。"
        action={
          <ButtonLink href="/admin/events/new">
            <Plus size={17} />
            创建活动
          </ButtonLink>
        }
      />
      <div className="admin-filter-bar">
        <nav aria-label="活动筛选" className="flex flex-wrap gap-1">
          {[
            ["all", "全部"],
            ["review", "待审报名"],
            ["active", "未结束"],
            ["draft", "草稿"],
            ["finished", "已结束 / 取消"],
          ].map(([value, label]) => (
            <ButtonLink
              key={value}
              href={href(value)}
              variant={filter === value ? "primary" : "ghost"}
              size="sm"
            >
              {label}
            </ButtonLink>
          ))}
        </nav>
        <form className="flex items-end gap-2" action="/admin/events">
          <input type="hidden" name="filter" value={filter} />
          <InputField
            label="搜索活动"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder="活动名称"
          />
          <Button type="submit" variant="secondary">
            搜索
          </Button>
        </form>
      </div>
      {events.length ? (
        <Card className="gap-0 overflow-hidden border border-border p-0 shadow-none">
          {events.map((event) => {
            const pending = event.registrations.filter(
              (item) => item.status === "PENDING",
            ).length;
            const approved = event.registrations.filter(
              (item) => item.status === "APPROVED",
            ).length;
            return (
              <div key={event.id} className="admin-list-row">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words font-semibold">{event.title}</h2>
                    <StatusChip
                      status={event.status}
                      label={eventStatusLabels[event.status]}
                    />
                    {pending ? (
                      <Chip color="warning" variant="soft" size="sm">
                        {pending} 条待审
                      </Chip>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {formatEventDate(event.startTime)} · {eventTypeLabel(event)}{" "}
                    · 已通过 {approved} / {event.maxParticipants} 人
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <ButtonLink
                    href={`/admin/events/${event.id}`}
                    variant={pending ? "primary" : "secondary"}
                    size="sm"
                  >
                    {pending ? "审核报名" : "查看报名"}
                  </ButtonLink>
                  <ButtonLink
                    href={`/admin/events/${event.id}?view=settings`}
                    variant="ghost"
                    size="sm"
                  >
                    编辑
                  </ButtonLink>
                </div>
              </div>
            );
          })}
        </Card>
      ) : (
        <EmptyState
          title={q || filter !== "all" ? "没有符合条件的活动" : "还没有活动"}
          description={
            q || filter !== "all"
              ? "试试其他筛选条件。"
              : "点击右上角“创建活动”开始安排。"
          }
        />
      )}
      <div className="admin-pagination">
        <span>共 {total} 场活动</span>
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <ButtonLink
              href={href(filter, page - 1)}
              variant="secondary"
              size="sm"
            >
              上一页
            </ButtonLink>
          ) : null}
          <span>
            {page} / {Math.max(1, Math.ceil(total / 20))}
          </span>
          {page * 20 < total ? (
            <ButtonLink
              href={href(filter, page + 1)}
              variant="secondary"
              size="sm"
            >
              下一页
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </main>
  );
}
