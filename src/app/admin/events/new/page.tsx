import { createEventAction } from "@/app/actions";
import { EventForm } from "@/components/event-form";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireAdmin();

  return (
    <main className="page-shell">
      <section className="rounded-md border border-black/10 bg-white p-5 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
          Admin
        </p>
        <h1 className="mt-1 text-3xl font-black">创建活动</h1>
        <div className="mt-6">
          <EventForm action={createEventAction} />
        </div>
      </section>
    </main>
  );
}
