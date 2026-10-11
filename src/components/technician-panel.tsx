import { useFormatter, useTranslations } from "next-intl";
import { AddPartForm, ResolveForm } from "@/components/technician-forms";
import { TransitionButton } from "@/components/ticket-actions";
import type { TicketStatus } from "@/lib/tickets/status";

// What the technician can do next, by status. The database enforces the same
// rules; this only decides which buttons to show.
export function TechnicianPanel({
  ticket,
  canTake,
  runningSince,
  lastComment,
}: {
  ticket: {
    id: string;
    status: TicketStatus;
    root_cause: string | null;
    resolution: string | null;
  };
  canTake: boolean;
  runningSince: string | null;
  lastComment: string | null;
}) {
  const t = useTranslations("Tech");
  const format = useFormatter();
  const { id, status } = ticket;

  return (
    <section
      aria-labelledby="tech-actions"
      className="mt-6 grid gap-4 rounded-xl border-2 border-foreground/15 bg-surface p-4"
    >
      <h2 id="tech-actions" className="font-semibold">
        {t("heading")}
      </h2>

      {status === "new" && canTake && (
        <TransitionButton ticketId={id} to="assigned" label={t("take")} />
      )}
      {status === "assigned" && (
        <TransitionButton ticketId={id} to="in_progress" label={t("start")} />
      )}
      {status === "on_hold" && (
        <>
          {lastComment && <Note label={t("holdReason")} text={lastComment} />}
          <TransitionButton
            ticketId={id}
            to="in_progress"
            label={t("resume")}
          />
        </>
      )}
      {status === "rejected" && (
        <>
          {lastComment && (
            <Note label={t("rejectedBy")} text={lastComment} tone="rejected" />
          )}
          <TransitionButton
            ticketId={id}
            to="in_progress"
            label={t("restart")}
          />
        </>
      )}
      {status === "in_progress" && (
        <>
          {runningSince && (
            <p className="flex items-center gap-2 text-sm font-medium text-status-progress">
              <span
                aria-hidden
                className="size-2 animate-pulse rounded-full bg-current"
              />
              {t("running", {
                time: format.dateTime(new Date(runningSince), {
                  timeStyle: "short",
                }),
              })}
            </p>
          )}
          <ResolveForm
            ticketId={id}
            rootCause={ticket.root_cause}
            resolution={ticket.resolution}
          />
          <TransitionButton
            ticketId={id}
            to="on_hold"
            label={t("hold")}
            variant="secondary"
          />
        </>
      )}

      {["assigned", "in_progress", "on_hold", "rejected"].includes(status) && (
        <div className="grid gap-3 border-t pt-4">
          <h3 className="font-semibold">{t("parts.heading")}</h3>
          <AddPartForm ticketId={id} />
        </div>
      )}
    </section>
  );
}

function Note({
  label,
  text,
  tone,
}: {
  label: string;
  text: string;
  tone?: "rejected";
}) {
  return (
    <div
      className={
        tone === "rejected"
          ? "rounded-lg bg-status-rejected/10 px-3 py-2.5 text-sm"
          : "rounded-lg bg-surface-muted px-3 py-2.5 text-sm"
      }
    >
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 whitespace-pre-line">{text}</p>
    </div>
  );
}
