import type { FoodItem } from "../types/food";

export const RECENT_SCANS_KEY = "nutriday.recentScans";
export const RECENT_SCANS_LIMIT = 8;

/** A scanned product with the barcode it was found by. Barcode is null for entries saved before barcodes were kept. */
export type RecentScan = FoodItem & { barcode: string | null };

/** Attaches the barcode a product was scanned or typed with. */
export function withBarcode(food: FoodItem, barcode: string): RecentScan {
  return { ...food, barcode };
}

/** Puts a scanned product first and drops an older copy of the same food. Keeps at most `limit` items. */
export function addRecentScan(current: RecentScan[], scan: RecentScan, limit = RECENT_SCANS_LIMIT): RecentScan[] {
  return [scan, ...current.filter((item) => item.id !== scan.id)].slice(0, limit);
}

/** Reads the list saved in this browser. Returns an empty list when storage is blocked or the data is damaged. */
export function readRecentScans(): RecentScan[] {
  try {
    const raw = window.localStorage.getItem(RECENT_SCANS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as Array<FoodItem & { barcode?: string | null }>)
      .slice(0, RECENT_SCANS_LIMIT)
      .map((item) => ({ ...item, barcode: item.barcode ?? null }));
  } catch {
    return [];
  }
}

export function writeRecentScans(foods: RecentScan[]): void {
  try {
    window.localStorage.setItem(RECENT_SCANS_KEY, JSON.stringify(foods));
  } catch {
    // Storage can be full or blocked (for example in a private window). The list then lasts for this visit only.
  }
}
