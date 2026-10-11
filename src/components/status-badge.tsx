import { useTranslations } from "next-intl";
import type { Priority, TicketStatus } from "@/lib/tickets/status";
import { cn } from "@/lib/utils";

const statusTone: Record<TicketStatus, string> = {
  new: "text-status-new bg-status-new/12",
  assigned: "text-status-assigned bg-status-assigned/12",
  in_progress: "text-status-progress bg-status-progress/14",
  on_hold: "text-status-hold bg-status-hold/14",
  resolved: "text-status-resolved bg-status-resolved/12",
  rejected: "text-status-rejected bg-status-rejected/12",
  confirmed: "text-status-done bg-status-done/12",
  closed: "text-status-closed bg-status-closed/12",
  cancelled: "text-status-closed bg-status-closed/8 line-through",
};

export function StatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  const t = useTranslations("Status");
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium",
        statusTone[status],
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {t(status)}
    </span>
  );
}

const priorityTone: Record<Priority, string> = {
  critical: "bg-priority-critical text-white",
  high: "bg-priority-high/15 text-priority-high",
  normal: "bg-surface-muted text-priority-normal",
  low: "bg-surface-muted text-priority-low",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const t = useTranslations("Priority");
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-md px-2 text-xs font-semibold tracking-wide uppercase",
        priorityTone[priority],
        className,
      )}
    >
      {t(priority)}
    </span>
  );
}
