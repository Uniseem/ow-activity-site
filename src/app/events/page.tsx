import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EmptyState, PageHeading } from "@/components/page-heading";
import { Chip } from "@/components/ui";
import { getPublicEvents } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function EventsPage() {
  const events = await getPublicEvents();
  return (
    <main className="page-shell">
      <PageHeading
        eyebrow="Community events"
        title="活动大厅"
        description="内战、娱乐、训练，找到你想加入的那一场。"
        action={
          <Chip variant="secondary">
            <CalendarDays size={14} />
            {events.length} 场活动
          </Chip>
        }
      />
      {events.length ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="暂时没有活动"
          description="新的活动发布后会展示在这里，稍后再来看看。"
        />
      )}
    </main>
  );
}
