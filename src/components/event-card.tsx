import { ArrowUpRight, CalendarClock } from "lucide-react";
import Link from "next/link";
import { ButtonLink, Capacity, Card, StatusChip } from "@/components/ui";
import { eventStatusLabels, eventTypeLabel } from "@/lib/format";
import { formatEventDate, shanghaiDateValue } from "@/lib/event-date";
export type EventCardProps = {
  event: {
    id: string;
    title: string;
    description: string;
    type: string;
    customType?: string | null;
    status: string;
    startTime: Date;
    maxParticipants: number;
    registrations?: readonly { id: string }[];
  };
  hrefPrefix?: string;
};
export function EventCard({ event, hrefPrefix = "/events" }: EventCardProps) {
  const href = hrefPrefix + "/" + event.id;
  return (
    <Card className="event-card" data-type={event.type}>
      <div className="event-card-header">
        <span className="event-card-type">{eventTypeLabel(event)}</span>
        <StatusChip
          status={event.status}
          label={
            eventStatusLabels[event.status as keyof typeof eventStatusLabels] ??
            event.status
          }
          className="relative z-10"
        />
      </div>
      <div className="event-card-body">
        <div className="flex-1">
          <h3 className="event-card-title">
            <Link href={href} className="hover:text-accent">
              {event.title}
            </Link>
          </h3>
          <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted">
            {event.description}
          </p>
        </div>
        <Capacity
          count={event.registrations?.length ?? 0}
          max={event.maxParticipants}
        />
        <div className="event-card-footer">
          <span className="flex min-w-0 items-center gap-1.5 text-[10px] text-muted">
            <CalendarClock size={13} className="shrink-0" />
            <time dateTime={shanghaiDateValue(event.startTime)}>
              {formatEventDate(event.startTime)}
            </time>
          </span>
          <ButtonLink
            href={href}
            variant="ghost"
            size="sm"
            className="shrink-0 px-2"
          >
            {hrefPrefix === "/events" ? "查看" : "管理"}
            <ArrowUpRight size={15} />
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}
