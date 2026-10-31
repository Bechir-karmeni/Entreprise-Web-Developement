import { describe, expect, it } from "vitest";
import type { PlanRow } from "./mealPlan";
import { pdfText, planToPdf } from "./planPdf";

function asText(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}

function row(index: number, recipe = `Recipe ${index}`): PlanRow {
  return { date: "2026-10-26", meal: "BREAKFAST", recipe, kcal: 500, proteinGrams: 20, carbsGrams: 30, fatGrams: 10 };
}

describe("pdfText", () => {
  it("escapes brackets and backslashes and keeps umlauts", () => {
    expect(pdfText("Oats (classic) \\ Müsli")).toBe("Oats \\(classic\\) \\\\ Müsli");
  });

  it("turns dashes and curly quotes into plain characters", () => {
    expect(pdfText("26 Oct – 1 Nov “Salat”")).toBe('26 Oct - 1 Nov "Salat"');
  });

  it("replaces characters the PDF font cannot show", () => {
    expect(pdfText("Salat 😀")).toBe("Salat ??");
  });
});

describe("planToPdf", () => {
  it("writes a PDF with a valid cross-reference table", () => {
    const pdf = asText(planToPdf("Week plan", [row(1), row(2)]));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf.endsWith("%%EOF\n")).toBe(true);
    const start = Number(pdf.match(/startxref\n(\d+)\n/)?.[1]);
    expect(pdf.slice(start, start + 4)).toBe("xref");
  });

  it("contains the recipe and meal text", () => {
    const pdf = asText(planToPdf("Week plan", [row(1, "Oats (honey)")]));
    expect(pdf).toContain("Breakfast");
    expect(pdf).toContain("Oats \\(honey\\)");
  });

  it("breaks into more pages when the plan is long", () => {
    const rows = Array.from({ length: 120 }, (_, index) => row(index));
    const pdf = asText(planToPdf("Week plan", rows));
    const pageCount = pdf.match(/\/Type \/Page /g)?.length ?? 0;
    expect(pageCount).toBeGreaterThan(1);
  });
});
