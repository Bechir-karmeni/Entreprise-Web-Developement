import { describe, expect, it } from "vitest";
import { parseEuroToCents } from "./money";

describe("parseEuroToCents", () => {
  it("accepts a comma or a dot as decimal separator", () => {
    expect(parseEuroToCents("2,50")).toBe(250);
    expect(parseEuroToCents("2.5")).toBe(250);
    expect(parseEuroToCents("12")).toBe(1200);
  });

  it("treats empty input as no price", () => {
    expect(parseEuroToCents("   ")).toBeNull();
  });

  it("rejects text that is not an amount", () => {
    expect(parseEuroToCents("abc")).toBeUndefined();
    expect(parseEuroToCents("2,505")).toBeUndefined();
    expect(parseEuroToCents("-3")).toBeUndefined();
  });

  it("rejects amounts above 10,000 euros", () => {
    expect(parseEuroToCents("10000")).toBe(1_000_000);
    expect(parseEuroToCents("10001")).toBeUndefined();
  });
});
