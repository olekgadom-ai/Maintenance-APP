import { describe, expect, it } from "vitest";
import { formatMinutes, workMinutes } from "./duration";

describe("work time", () => {
  const now = new Date("2026-10-11T12:00:00Z");

  it("sums closed sessions and counts an open one up to now", () => {
    expect(
      workMinutes(
        [
          {
            started_at: "2026-10-11T08:00:00Z",
            ended_at: "2026-10-11T08:45:00Z",
          },
          { started_at: "2026-10-11T11:30:00Z", ended_at: null },
        ],
        now,
      ),
    ).toBe(75);
  });

  it("formats hours and minutes", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(45)).toBe("45 min");
    expect(formatMinutes(75)).toBe("1 h 15 min");
  });
});
