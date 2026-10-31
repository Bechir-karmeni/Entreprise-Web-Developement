import { describe, expect, it } from "vitest";
import { addRecentScan, withBarcode, type RecentScan } from "./recentScans";
import type { FoodItem } from "../types/food";

function food(id: string): FoodItem {
  return { id, name: `Food ${id}` } as FoodItem;
}

function scan(id: string): RecentScan {
  return withBarcode(food(id), `40${id}0000`);
}

describe("addRecentScan", () => {
  it("puts the newest scan first", () => {
    const result = addRecentScan([scan("a"), scan("b")], scan("c"));
    expect(result.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });

  it("moves a product that is scanned again to the front without duplicating it", () => {
    const result = addRecentScan([scan("a"), scan("b")], scan("b"));
    expect(result.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("keeps only the given number of products", () => {
    const result = addRecentScan([scan("a"), scan("b"), scan("c")], scan("d"), 3);
    expect(result.map((item) => item.id)).toEqual(["d", "a", "b"]);
  });
});

describe("withBarcode", () => {
  it("keeps the barcode with the product", () => {
    expect(withBarcode(food("a"), "3017620422003").barcode).toBe("3017620422003");
  });
});
