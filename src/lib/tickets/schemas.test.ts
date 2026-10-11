import { describe, expect, it } from "vitest";
import { toTicketError } from "./errors";
import { isAcceptedPhoto, reportTicketSchema } from "./schemas";

const machineId = "6f1f8f1e-6a8e-4f7a-9d55-8a3c1f0b2a11";

describe("reportTicketSchema", () => {
  it("accepts a minimal report and applies defaults", () => {
    const r = reportTicketSchema.parse({ machineId, title: "  Wyciek oleju " });
    expect(r).toEqual({
      machineId,
      title: "Wyciek oleju",
      description: "",
      priority: "normal",
      machineStopped: false,
    });
  });

  it("reads the checkbox value", () => {
    const r = reportTicketSchema.parse({
      machineId,
      title: "Robot stoi",
      priority: "critical",
      machineStopped: "on",
    });
    expect(r.machineStopped).toBe(true);
    expect(r.priority).toBe("critical");
  });

  it("rejects a missing machine, a too short title and unknown priority", () => {
    const r = reportTicketSchema.safeParse({
      machineId: "",
      title: "ab",
      priority: "urgent",
    });
    expect(r.success).toBe(false);
    const fields = r.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(
      expect.arrayContaining(["machineId", "title", "priority"]),
    );
  });
});

describe("photos and errors", () => {
  it("accepts only non-empty images up to 10 MB", () => {
    const img = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
    const empty = new File([], "b.jpg", { type: "image/jpeg" });
    expect(isAcceptedPhoto(img)).toBe(true);
    expect(isAcceptedPhoto(pdf)).toBe(false);
    expect(isAcceptedPhoto(empty)).toBe(false);
  });

  it("maps database error keys and hides anything else", () => {
    expect(toTicketError({ message: "comment_required" })).toBe(
      "comment_required",
    );
    expect(toTicketError({ message: 'relation "x" does not exist' })).toBe(
      "unknown",
    );
    expect(toTicketError(null)).toBe("unknown");
  });
});
