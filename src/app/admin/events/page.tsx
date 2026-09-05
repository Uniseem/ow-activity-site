import { Plus } from "lucide-react";
import { AdminNav } from "@/components/admin-nav";
import { EventCard } from "@/components/event-card";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { ButtonLink } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncEventStatuses } from "@/lib/event-schedule";

export const dynamic = "force-dynamic";
export default async function AdminEventsPage() {
  await requireAdmin();
  await syncEventStatuses();
  const events = await prisma.event.findMany({
    orderBy: { startTime: "desc" },
    include: {
      registrations: { where: { status: "APPROVED" }, select: { id: true } },
    },
  });
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Event management"
        title="活动与报名管理"
        description="从草稿到集结，管理每一场社区活动。"
        action={
          <ButtonLink href="/admin/events/new">
            <Plus size={17} />
            创建活动
          </ButtonLink>
        }
      />
      <AdminNav />
      {events.length ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              hrefPrefix="/admin/events"
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="创建社区的第一场活动"
          description="设置玩法、时间和人数，准备迎接队友加入。"
          action={
            <ButtonLink href="/admin/events/new">
              <Plus size={16} />
              创建活动
            </ButtonLink>
          }
        />
      )}
    </main>
  );
}
