"use client";

import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  assignTicket,
  setTicketPriority,
  transitionTicket,
  type ActionState,
} from "@/lib/tickets/actions";
import {
  COMMENT_REQUIRED,
  PRIORITIES,
  type Priority,
  type TicketStatus,
} from "@/lib/tickets/status";
import { cn } from "@/lib/utils";

const initial: ActionState = { error: null };

function ErrorText({ state }: { state: ActionState }) {
  const t = useTranslations("Errors");
  return state.error ? (
    <p role="alert" className="text-sm text-status-rejected">
      {t(state.error)}
    </p>
  ) : null;
}

export type Technician = { id: string; full_name: string };

export function AssignForm({
  ticketId,
  technicians,
  currentId,
  compact = false,
}: {
  ticketId: string;
  technicians: Technician[];
  currentId?: string | null;
  compact?: boolean;
}) {
  const t = useTranslations("Actions");
  const [state, action, pending] = useActionState(assignTicket, initial);
  const [selected, setSelected] = useState(
    currentId ?? technicians[0]?.id ?? "",
  );

  if (technicians.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noTechnicians")}</p>
    );
  }

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`tech-${ticketId}`}>
          {t("technician")}
        </label>
        <select
          id={`tech-${ticketId}`}
          name="technicianId"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className={cn(
            "min-w-36 flex-1 cursor-pointer rounded-lg border bg-surface px-3 text-base",
            compact ? "h-11" : "h-12",
          )}
        >
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.full_name}
            </option>
          ))}
        </select>
        <Button
          type="submit"
          size={compact ? "sm" : "md"}
          disabled={pending || selected === currentId}
        >
          {pending && <LoaderCircle aria-hidden className="animate-spin" />}
          {currentId ? t("reassign") : t("assign")}
        </Button>
      </div>
      <ErrorText state={state} />
    </form>
  );
}

const priorityActive: Record<Priority, string> = {
  critical: "border-priority-critical bg-priority-critical text-white",
  high: "border-priority-high bg-priority-high/15 text-priority-high",
  normal: "border-foreground bg-surface-muted text-foreground",
  low: "border-foreground/50 bg-surface-muted text-muted-foreground",
};

export function PriorityForm({
  ticketId,
  current,
}: {
  ticketId: string;
  current: Priority;
}) {
  const tp = useTranslations("Priority");
  const t = useTranslations("Actions");
  const [state, action, pending] = useActionState(setTicketPriority, initial);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <fieldset
        disabled={pending}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        <legend className="sr-only">{t("priority")}</legend>
        {PRIORITIES.map((p) => (
          <button
            key={p}
            type="submit"
            name="priority"
            value={p}
            aria-pressed={current === p}
            className={cn(
              "h-11 cursor-pointer rounded-lg border-2 bg-surface text-sm font-medium transition-colors disabled:cursor-wait",
              current === p
                ? priorityActive[p]
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {tp(p)}
          </button>
        ))}
      </fieldset>
      <ErrorText state={state} />
    </form>
  );
}

// One workflow step. Steps that need a reason open a comment box first.
export function TransitionButton({
  ticketId,
  to,
  label,
  variant = "primary",
}: {
  ticketId: string;
  to: TicketStatus;
  label: string;
  variant?: ButtonProps["variant"];
}) {
  const t = useTranslations("Actions");
  const [state, action, pending] = useActionState(transitionTicket, initial);
  const needsComment = COMMENT_REQUIRED.includes(to);
  const [open, setOpen] = useState(false);

  if (needsComment && !open) {
    return (
      <Button
        type="button"
        variant={variant}
        className="w-full"
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      <input type="hidden" name="to" value={to} />
      {needsComment && (
        <>
          <label htmlFor={`comment-${to}`} className="text-sm font-medium">
            {t(`commentLabel.${to as "rejected" | "cancelled" | "on_hold"}`)}
          </label>
          <textarea
            id={`comment-${to}`}
            name="comment"
            required
            rows={3}
            maxLength={2000}
            autoFocus
            className="w-full rounded-lg border bg-surface px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </>
      )}
      <div className="flex gap-2">
        {needsComment && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {t("back")}
          </Button>
        )}
        <Button
          type="submit"
          variant={variant}
          disabled={pending}
          className="flex-1"
        >
          {pending && <LoaderCircle aria-hidden className="animate-spin" />}
          {label}
        </Button>
      </div>
      <ErrorText state={state} />
    </form>
  );
}
