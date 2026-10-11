import { describe, expect, it } from "vitest";
import { machineQrUrl, parseMachineQr } from "./qr";

const token = "0b7f2c1e-58a4-4d0e-9f3b-1c2d3e4f5a6b";

describe("machine QR codes", () => {
  it("round-trips the label link", () => {
    expect(
      parseMachineQr(machineQrUrl("https://ur.example.com", "pl", token)),
    ).toBe(token);
  });

  it("accepts a bare token in any case", () => {
    expect(parseMachineQr(` ${token.toUpperCase()} `)).toBe(token);
  });

  it("rejects anything else", () => {
    expect(parseMachineQr("https://example.com/?m=abc")).toBeNull();
    expect(parseMachineQr("hello")).toBeNull();
  });
});
