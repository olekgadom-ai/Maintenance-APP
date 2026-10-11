// Message keys raised by the database functions (see supabase/migrations/*_ticket_workflow.sql).
export const TICKET_ERRORS = [
  "forbidden",
  "machine_not_found",
  "ticket_not_found",
  "invalid_transition",
  "use_assign_ticket",
  "self_assign_disabled",
  "not_assignee",
  "comment_required",
  "resolution_required",
  "invalid_technician",
  "ticket_locked",
] as const;

export type TicketError = (typeof TICKET_ERRORS)[number] | "unknown";

export function toTicketError(
  error: { message?: string } | null | undefined,
): TicketError {
  const message = error?.message ?? "";
  return (TICKET_ERRORS as readonly string[]).includes(message)
    ? (message as TicketError)
    : "unknown";
}
