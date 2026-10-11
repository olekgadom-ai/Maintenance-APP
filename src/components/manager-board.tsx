import { useTranslations } from "next-intl";
import { AssignForm, type Technician } from "@/components/ticket-actions";
import { TicketCard, type TicketSummary } from "@/components/ticket-card";
import type { TicketStatus } from "@/lib/tickets/status";
import { cn } from "@/lib/utils";

// Board columns follow the manager's questions: what needs a technician, what is
// being worked on, what waits for the area leader, what can be closed.
type ColumnKey =
  "unassigned" | "assigned" | "inWork" | "awaitingLeader" | "toClose";

const COLUMNS: { key: ColumnKey; statuses: TicketStatus[] }[] = [
  { key: "unassigned", statuses: ["new"] },
  { key: "assigned", statuses: ["assigned"] },
  { key: "inWork", statuses: ["in_progress", "on_hold", "rejected"] },
  { key: "awaitingLeader", statuses: ["resolved"] },
  { key: "toClose", statuses: ["confirmed"] },
];

export function ManagerBoard({
  tickets,
  technicians,
  now,
}: {
  tickets: TicketSummary[];
  technicians: Technician[];
  now: Date;
}) {
  const t = useTranslations("Board");

  return (
    <div className="mt-6 grid gap-8 xl:grid-cols-5 xl:gap-4">
      {COLUMNS.map((column) => {
        const items = tickets.filter((ticket) =>
          column.statuses.includes(ticket.status),
        );
        const urgent = column.key === "unassigned" && items.length > 0;
        return (
          <section
            key={column.key}
            aria-labelledby={`col-${column.key}`}
            className="min-w-0"
          >
            <h2
              id={`col-${column.key}`}
              className="mb-3 flex items-center gap-2 text-sm font-semibold"
            >
              {t(`columns.${column.key}`)}
              <span
                className={cn(
                  "inline-grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs",
                  urgent
                    ? "bg-status-new text-white"
                    : "bg-surface-muted text-muted-foreground",
                )}
              >
                {items.length}
              </span>
            </h2>
            {items.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                {t("emptyColumn")}
              </p>
            ) : (
              <ul className="grid gap-3">
                {items.map((ticket) => (
                  <li key={ticket.id}>
                    <TicketCard
                      ticket={ticket}
                      now={now}
                      showStatus={column.statuses.length > 1}
                      showAssignee
                      footer={
                        ticket.status === "new" ? (
                          <AssignForm
                            ticketId={ticket.id}
                            technicians={technicians}
                            compact
                          />
                        ) : undefined
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
