import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/database.types";
import { PRIORITIES, ROLES, TICKET_STATUSES, TRANSITIONS } from "./status";

const migrationsDir = join(process.cwd(), "supabase/migrations");
const workflowSql = readFileSync(
  join(
    migrationsDir,
    readdirSync(migrationsDir).find((f) => f.endsWith("_ticket_workflow.sql"))!,
  ),
  "utf8",
);

describe("client model matches the database", () => {
  it("has the same enums as the generated types", () => {
    expect([...TICKET_STATUSES]).toEqual(Constants.public.Enums.ticket_status);
    expect([...PRIORITIES]).toEqual(Constants.public.Enums.ticket_priority);
    expect([...ROLES]).toEqual(Constants.public.Enums.user_role);
  });

  it("has the same transitions as private.ticket_transitions", () => {
    const insert = workflowSql.match(
      /insert into private\.ticket_transitions[^;]+;/,
    )![0];
    const fromSql = [...insert.matchAll(/\('(\w+)', '(\w+)', '(\w+)'\)/g)]
      .map(([, from, to, role]) => `${from}>${to}:${role}`)
      .sort();
    const fromTs = Object.entries(TRANSITIONS)
      .flatMap(([from, list]) =>
        list.flatMap((t) => t.roles.map((role) => `${from}>${t.to}:${role}`)),
      )
      .sort();
    expect(fromSql.length).toBeGreaterThan(0);
    expect(fromSql).toEqual(fromTs);
  });
});
