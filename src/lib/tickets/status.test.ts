import { describe, expect, it } from "vitest";
import {
  TICKET_STATUSES,
  TRANSITIONS,
  availableTransitions,
  canTransition,
  isOpen,
  isMachineDown,
  isTerminal,
} from "./status";

describe("ticket lifecycle", () => {
  it("follows the happy path through every role", () => {
    expect(canTransition("new", "assigned", "manager")).toBe(true);
    expect(canTransition("assigned", "in_progress", "technician")).toBe(true);
    expect(canTransition("in_progress", "resolved", "technician")).toBe(true);
    expect(canTransition("resolved", "confirmed", "area_leader")).toBe(true);
    expect(canTransition("confirmed", "closed", "manager")).toBe(true);
  });

  it("sends a rejected fix back to the technician", () => {
    expect(canTransition("resolved", "rejected", "area_leader")).toBe(true);
    expect(availableTransitions("rejected", "technician")).toEqual([
      "in_progress",
    ]);
  });

  it("only lets the area leader confirm a fix", () => {
    expect(canTransition("resolved", "confirmed", "technician")).toBe(false);
    expect(canTransition("resolved", "confirmed", "manager")).toBe(false);
  });

  it("does not allow skipping steps", () => {
    expect(canTransition("new", "resolved", "technician")).toBe(false);
    expect(canTransition("in_progress", "closed", "manager")).toBe(false);
  });

  it("has a transition table entry for every status and only known targets", () => {
    for (const status of TICKET_STATUSES) {
      expect(TRANSITIONS[status]).toBeDefined();
      for (const t of TRANSITIONS[status]) {
        expect(TICKET_STATUSES).toContain(t.to);
      }
    }
  });

  it("treats closed and cancelled as terminal", () => {
    expect(isTerminal("closed")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("resolved")).toBe(false);
    expect(isOpen("resolved")).toBe(true);
    expect(isOpen("confirmed")).toBe(false);
  });
});

describe("machine down banner", () => {
  it("shows until the repair is finished", () => {
    expect(isMachineDown({ status: "on_hold", machine_stopped: true })).toBe(
      true,
    );
    expect(isMachineDown({ status: "rejected", machine_stopped: true })).toBe(
      true,
    );
    expect(isMachineDown({ status: "resolved", machine_stopped: true })).toBe(
      false,
    );
    expect(isMachineDown({ status: "new", machine_stopped: false })).toBe(
      false,
    );
  });
});
