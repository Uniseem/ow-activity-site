import { CalendarClock, Users } from "lucide-react";
import Link from "next/link";

import {
  eventStatusLabels,
  eventTypeLabels,
  formatDateTime,
} from "@/lib/format";

type EventCardProps = {
  event: {
    id: string;
    title: string;
    description: string;
    type: string;
    status: string;
    startTime: Date;
    maxParticipants: number;
    registrations?: readonly { id: string }[];
  };
  hrefPrefix?: string;
};

export function EventCard({ event, hrefPrefix = "/events" }: EventCardProps) {
  const approvedCount = event.registrations?.length ?? 0;

  return (
    <article className="grid min-h-64 rounded-md border border-black/10 bg-white shadow-sm">
      <div className="h-24 rounded-t-md bg-[url('/arena-cover.png')] bg-cover bg-center" />
      <div className="grid gap-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-[var(--orange)] px-2 py-1 text-xs font-black text-white">
            {eventTypeLabels[event.type as keyof typeof eventTypeLabels] ??
              event.type}
          </span>
          <span className="rounded-md border border-black/10 px-2 py-1 text-xs font-bold text-[#3d4451]">
            {eventStatusLabels[event.status as keyof typeof eventStatusLabels] ??
              event.status}
          </span>
        </div>

        <div>
          <h3 className="text-xl font-black">{event.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
            {event.description}
          </p>
        </div>

        <div className="grid gap-2 text-sm font-semibold text-[#3d4451]">
          <span className="inline-flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-[var(--teal)]" />
            {formatDateTime(event.startTime)}
          </span>
          <span className="inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-[var(--teal)]" />
            {approvedCount}/{event.maxParticipants}
          </span>
        </div>

        <Link
          href={`${hrefPrefix}/${event.id}`}
          className="focus-ring inline-flex min-h-10 items-center justify-center rounded-md bg-[#181a20] px-4 py-2 text-sm font-bold text-white hover:bg-black"
        >
          查看
        </Link>
      </div>
    </article>
  );
}
