import { ChevronRight, UserRound } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { Link } from "@/i18n/navigation";
import {
  isMachineDown,
  type Priority,
  type TicketStatus,
} from "@/lib/tickets/status";

export type TicketSummary = {
  id: string;
  number: string;
  title: string;
  status: TicketStatus;
  priority: Priority;
  machine_stopped: boolean;
  reported_at: string;
  machines: { code: string; name: string } | null;
  assignee?: { full_name: string } | null;
};

export function TicketCard({
  ticket,
  now,
  showStatus = true,
  showAssignee = false,
  footer,
}: {
  ticket: TicketSummary;
  now: Date;
  showStatus?: boolean;
  showAssignee?: boolean;
  footer?: ReactNode;
}) {
  const t = useTranslations("Home");
  const format = useFormatter();

  return (
    <div className="overflow-hidden rounded-xl border bg-surface">
      <Link
        href={`/tickets/${ticket.id}`}
        className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {ticket.number}
            </span>
            <PriorityBadge priority={ticket.priority} />
            {isMachineDown(ticket) && (
              <span className="inline-flex h-7 items-center rounded-md bg-priority-critical/12 px-2 text-xs font-semibold text-priority-critical">
                {t("machineStopped")}
              </span>
            )}
          </div>
          <p className="mt-2 font-semibold text-pretty">{ticket.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {ticket.machines?.code} · {ticket.machines?.name} ·{" "}
            <time
              dateTime={ticket.reported_at}
              title={format.dateTime(new Date(ticket.reported_at), {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            >
              {format.relativeTime(new Date(ticket.reported_at), now)}
            </time>
          </p>
          {(showStatus || (showAssignee && ticket.assignee)) && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {showStatus && <StatusBadge status={ticket.status} />}
              {showAssignee && ticket.assignee && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <UserRound aria-hidden className="size-4" />
                  {ticket.assignee.full_name}
                </span>
              )}
            </div>
          )}
        </div>
        <ChevronRight
          aria-hidden
          className="size-5 shrink-0 text-muted-foreground"
        />
      </Link>
      {footer && <div className="border-t px-4 py-3">{footer}</div>}
    </div>
  );
}
