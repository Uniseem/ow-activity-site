import { EventCard } from "@/components/event-card";
import { getPublicEvents } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function EventsPage() {
  const events = await getPublicEvents();

  return (
    <main className="page-shell grid gap-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
          Events
        </p>
        <h1 className="mt-1 text-3xl font-black">活动列表</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          报名提交后进入待审核状态，通过后才计入活动人数。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </main>
  );
}
