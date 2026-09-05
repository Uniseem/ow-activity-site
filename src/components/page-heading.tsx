import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { Inbox } from "lucide-react";

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div className="min-w-0">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="items-center py-14 text-center">
      <span className="icon-tile mb-2">
        <Inbox size={22} aria-hidden="true" />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-md text-sm leading-6 text-muted">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </Card>
  );
}
