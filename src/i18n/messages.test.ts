import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import pl from "../../messages/pl.json";
import { PRIORITIES, ROLES, TICKET_STATUSES } from "@/lib/tickets/status";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null
      ? keys(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("translations", () => {
  it("have the same keys in every locale", () => {
    expect(keys(en).sort()).toEqual(keys(pl).sort());
  });

  it("cover every status, priority and role", () => {
    for (const s of TICKET_STATUSES) expect(pl.Status[s]).toBeTruthy();
    for (const p of PRIORITIES) expect(pl.Priority[p]).toBeTruthy();
    for (const r of ROLES) expect(pl.Roles[r].name).toBeTruthy();
  });
});
