import { Plus } from "lucide-react";
import Link from "next/link";

import { EventCard } from "@/components/event-card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  await requireAdmin();

  const events = await prisma.event.findMany({
    orderBy: { startTime: "desc" },
    include: {
      registrations: {
        where: { status: "APPROVED" },
        select: { id: true },
      },
    },
  });

  return (
    <main className="page-shell grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-[var(--teal)]">
            Admin
          </p>
          <h1 className="mt-1 text-3xl font-black">活动管理</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="focus-ring inline-flex min-h-10 items-center gap-2 rounded-md bg-[var(--orange)] px-4 py-2 text-sm font-black text-white hover:bg-[#dd6815]"
        >
          <Plus className="h-4 w-4" />
          创建活动
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} hrefPrefix="/admin/events" />
        ))}
      </div>
    </main>
  );
}
