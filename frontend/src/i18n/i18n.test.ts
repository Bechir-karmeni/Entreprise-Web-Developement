import { describe, expect, it } from "vitest";
import { de } from "./de";
import { en } from "./en";

/** Lists every dotted key path in a messages object, for example "dashboard.calories". */
function keysOf(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => keysOf(child, prefix ? `${prefix}.${key}` : key));
}

describe("translations", () => {
  it("German has exactly the same keys as English", () => {
    expect(keysOf(de).sort()).toEqual(keysOf(en).sort());
  });

  it("no English or German text is empty", () => {
    for (const key of keysOf(en)) {
      const english = key.split(".").reduce<any>((node, part) => node[part], en);
      const german = key.split(".").reduce<any>((node, part) => node[part], de);
      expect(english.trim().length, `en ${key}`).toBeGreaterThan(0);
      expect(german.trim().length, `de ${key}`).toBeGreaterThan(0);
    }
  });
});
