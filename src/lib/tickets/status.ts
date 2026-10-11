// Single source of truth for the breakdown ticket lifecycle on the client side.
// The database function `transition_ticket` enforces the same rules (stage 2).

export const ROLES = ["area_leader", "technician", "manager"] as const;
export type Role = (typeof ROLES)[number];

export const TICKET_STATUSES = [
  "new",
  "assigned",
  "in_progress",
  "on_hold",
  "resolved",
  "rejected",
  "confirmed",
  "closed",
  "cancelled",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const PRIORITIES = ["critical", "high", "normal", "low"] as const;
export type Priority = (typeof PRIORITIES)[number];

type Transition = { to: TicketStatus; roles: readonly Role[] };

export const TRANSITIONS: Record<TicketStatus, readonly Transition[]> = {
  // A technician may take a ticket from the pool when the manager allows self-assignment.
  new: [
    { to: "assigned", roles: ["manager", "technician"] },
    { to: "cancelled", roles: ["manager"] },
  ],
  assigned: [
    { to: "in_progress", roles: ["technician"] },
    { to: "cancelled", roles: ["manager"] },
  ],
  in_progress: [
    { to: "on_hold", roles: ["technician"] },
    { to: "resolved", roles: ["technician"] },
  ],
  on_hold: [{ to: "in_progress", roles: ["technician"] }],
  resolved: [
    { to: "confirmed", roles: ["area_leader"] },
    { to: "rejected", roles: ["area_leader"] },
  ],
  rejected: [{ to: "in_progress", roles: ["technician"] }],
  confirmed: [{ to: "closed", roles: ["manager"] }],
  closed: [],
  cancelled: [],
};

export function canTransition(
  from: TicketStatus,
  to: TicketStatus,
  role: Role,
): boolean {
  return TRANSITIONS[from].some((t) => t.to === to && t.roles.includes(role));
}

export function availableTransitions(
  from: TicketStatus,
  role: Role,
): TicketStatus[] {
  return TRANSITIONS[from]
    .filter((t) => t.roles.includes(role))
    .map((t) => t.to);
}

export function isTerminal(status: TicketStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

// Ticket is still open from the production floor's point of view (counts towards downtime).
export function isOpen(status: TicketStatus): boolean {
  return !["confirmed", "closed", "cancelled"].includes(status);
}
