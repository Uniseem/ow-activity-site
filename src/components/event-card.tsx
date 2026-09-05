import { ArrowUpRight, CalendarClock } from "lucide-react";
import Link from "next/link";
import { ButtonLink, Capacity, Card, Chip, StatusChip } from "@/components/ui";
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
  const href = hrefPrefix + "/" + event.id;
  const date = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "numeric",
    day: "2-digit",
  }).formatToParts(event.startTime);
  return (
    <Card className="event-card gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="date-tile" aria-hidden="true">
          <span className="text-[10px] font-semibold">
            {date.find((part) => part.type === "month")?.value} 月
          </span>
          <span className="text-2xl font-bold leading-8">
            {date.find((part) => part.type === "day")?.value}
          </span>
        </div>
        <StatusChip
          status={event.status}
          label={
            eventStatusLabels[event.status as keyof typeof eventStatusLabels] ??
            event.status
          }
        />
      </div>
      <div className="flex-1">
        <Chip size="sm" variant="secondary">
          {eventTypeLabels[event.type as keyof typeof eventTypeLabels] ??
            event.type}
        </Chip>
        <h3 className="mt-3 text-xl font-semibold tracking-tight">
          <Link href={href} className="hover:text-accent">
            {event.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
          {event.description}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted">
        <CalendarClock size={15} />
        <time dateTime={event.startTime.toISOString()}>
          {formatDateTime(event.startTime)}
        </time>
      </div>
      <Capacity
        count={event.registrations?.length ?? 0}
        max={event.maxParticipants}
      />
      <ButtonLink
        href={href}
        variant="secondary"
        className="w-full justify-between"
      >
        {hrefPrefix === "/events" ? "查看活动" : "管理活动"}
        <ArrowUpRight size={16} />
      </ButtonLink>
    </Card>
  );
}
