import type { PlanMeal } from "../types/mealPlan";
import type { PlanRow } from "./mealPlan";

/** A4 page size in PDF points. */
const W = 595;
const H = 842;
const M = 40;
const CONTENT_WIDTH = W - 2 * M;
const ROW_HEIGHT = 24;
const FOOTER_LINE = 58;

/** Right edges of the numeric columns. */
const KCAL_EDGE = 404;
const PROTEIN_EDGE = 456;
const CARBS_EDGE = 506;
const FAT_EDGE = W - M - 10;
const RECIPE_X = 214;
const RECIPE_WIDTH = 172;

type Color = [number, number, number];

const GREEN: Color = [0.02, 0.37, 0.27];
const GREEN_SOFT: Color = [0.74, 0.93, 0.85];
const WHITE: Color = [1, 1, 1];
const INK: Color = [0.12, 0.16, 0.23];
const MUTED: Color = [0.39, 0.45, 0.55];
const RULE: Color = [0.89, 0.91, 0.94];
const RULE_STRONG: Color = [0.7, 0.74, 0.8];
const STRIPE: Color = [0.97, 0.98, 0.99];
const HEAD_BG: Color = [0.94, 0.96, 0.97];

const MEAL_COLOR: Record<PlanMeal, Color> = {
  BREAKFAST: [0.96, 0.62, 0.04],
  LUNCH: [0.06, 0.72, 0.51],
  DINNER: [0.39, 0.4, 0.95],
  SNACK: [0.93, 0.28, 0.6],
};

const MEAL_LABEL: Record<PlanMeal, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  SNACK: "Snack",
};

/**
 * Makes text safe for a PDF string. Brackets and backslashes are escaped. Typographic dashes and quotes become
 * plain characters. Characters the standard WinAnsi encoding cannot show (for example emoji) become "?".
 */
export function pdfText(text: string): string {
  return text
    .replace(/[–—]/g, "-")
    .replace(/[“”„]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x20-\x7e\xa0-\xff]/g, "?")
    .replace(/[\\()]/g, (char) => `\\${char}`);
}

/** Approximate width of Helvetica text in points. Good enough to align columns; the font is proportional. */
function textWidth(value: string, size: number, bold = false): number {
  return value.length * size * (bold ? 0.6 : 0.55);
}

function fitText(value: string, size: number, maxWidth: number): string {
  if (textWidth(value, size) <= maxWidth) return value;
  let shortened = value;
  while (shortened.length > 1 && textWidth(`${shortened}...`, size) > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}...`;
}

function rgb(color: Color): string {
  return `${color[0]} ${color[1]} ${color[2]}`;
}

function text(x: number, y: number, value: string, size: number, bold: boolean, color: Color): string {
  return `${rgb(color)} rg BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${pdfText(value)}) Tj ET`;
}

/** Text whose right edge sits at the given x. */
function rightText(edge: number, y: number, value: string, size: number, bold: boolean, color: Color): string {
  return text(edge - textWidth(value, size, bold), y, value, size, bold, color);
}

function rect(x: number, y: number, width: number, height: number, color: Color): string {
  return `${rgb(color)} rg ${x} ${y} ${width} ${height} re f`;
}

function line(x1: number, x2: number, y: number, color: Color, width: number): string {
  return `${rgb(color)} RG ${width} w ${x1} ${y} m ${x2} ${y} l S`;
}

/** A filled circle drawn from four Bézier curves. */
function circle(cx: number, cy: number, r: number, color: Color): string {
  const k = 0.5523 * r;
  return [
    `${rgb(color)} rg`,
    `${cx + r} ${cy} m`,
    `${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c`,
    `${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c`,
    `${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c`,
    `${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c f`,
  ].join("\n");
}

/** 14784 becomes "14,784". */
function grouped(value: number): string {
  return value.toLocaleString("en-US");
}

/** "Mon 26 Oct" from a yyyy-MM-dd string. */
function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

/**
 * Builds a PDF from page content streams. Uses the built-in Helvetica fonts, so no font file is needed.
 * The result is a valid PDF 1.4 file with a cross-reference table.
 */
export function buildPdf(pageContents: string[]): Uint8Array {
  const pageIds = pageContents.map((_, index) => 5 + index * 2);
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageContents.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  ];
  pageContents.forEach((content, index) => {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${pageIds[index] + 1} 0 R >>`,
    );
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  // Every character is below 256 (see pdfText), so one character is one byte.
  const bytes = new Uint8Array(out.length);
  for (let index = 0; index < out.length; index += 1) {
    bytes[index] = out.charCodeAt(index);
  }
  return bytes;
}

/**
 * A printable A4 week plan: a header band, three summary figures, a striped table with one row per planned meal
 * and a weekly total, with page numbers in the footer. The table header repeats on every page.
 */
export function planToPdf(title: string, rows: PlanRow[]): Uint8Array {
  const days = new Set(rows.map((row) => row.date)).size;
  const sum = (pick: (row: PlanRow) => number) => rows.reduce((total, row) => total + pick(row), 0);
  const totalKcal = Math.round(sum((row) => row.kcal));
  const totalProtein = Math.round(sum((row) => row.proteinGrams));
  const totalCarbs = Math.round(sum((row) => row.carbsGrams));
  const totalFat = Math.round(sum((row) => row.fatGrams));

  const pages: string[][] = [];
  let ops: string[] = [];
  let y = 0;

  const drawTableHeader = () => {
    ops.push(rect(M, y - 22, CONTENT_WIDTH, 22, HEAD_BG));
    const base = y - 14;
    ops.push(text(M + 10, base, "DATE", 7.5, true, MUTED));
    ops.push(text(122, base, "MEAL", 7.5, true, MUTED));
    ops.push(text(RECIPE_X, base, "RECIPE", 7.5, true, MUTED));
    ops.push(rightText(KCAL_EDGE, base, "KCAL", 7.5, true, MUTED));
    ops.push(rightText(PROTEIN_EDGE, base, "PROTEIN", 7.5, true, MUTED));
    ops.push(rightText(CARBS_EDGE, base, "CARBS", 7.5, true, MUTED));
    ops.push(rightText(FAT_EDGE, base, "FAT", 7.5, true, MUTED));
    y -= 22;
  };

  const openPage = (first: boolean) => {
    ops = [];
    if (first) {
      ops.push(rect(0, H - 104, W, 104, GREEN));
      ops.push(text(M, H - 52, title, 20, true, WHITE));
      ops.push(text(M, H - 72, "NutriDay meal plan  ·  kcal per portion, macros in grams", 10, false, GREEN_SOFT));

      const boxWidth = (CONTENT_WIDTH - 20) / 3;
      const boxes: [string, string][] = [
        ["PLANNED MEALS", String(rows.length)],
        ["AVG KCAL PER DAY", days > 0 ? `${grouped(Math.round(totalKcal / days))} kcal` : "-"],
        ["AVG PROTEIN PER DAY", days > 0 ? `${Math.round(totalProtein / days)} g` : "-"],
      ];
      boxes.forEach(([label, value], index) => {
        const x = M + index * (boxWidth + 10);
        ops.push(rect(x, H - 182, boxWidth, 60, STRIPE));
        ops.push(rect(x, H - 182, 3, 60, GREEN));
        ops.push(text(x + 14, H - 142, label, 7.5, true, MUTED));
        ops.push(text(x + 14, H - 166, value, 16, true, INK));
      });
      y = H - 216;
    } else {
      ops.push(text(M, H - 52, title, 11, true, GREEN));
      ops.push(line(M, W - M, H - 66, RULE, 0.6));
      y = H - 84;
    }
    drawTableHeader();
  };

  const ensureSpace = (height: number) => {
    if (y - height < FOOTER_LINE) {
      pages.push(ops);
      openPage(false);
    }
  };

  openPage(true);
  rows.forEach((row, index) => {
    ensureSpace(ROW_HEIGHT);
    const nextDate = rows[index + 1]?.date;
    const endsDay = nextDate !== undefined && nextDate !== row.date;
    if (index % 2 === 1) ops.push(rect(M, y - ROW_HEIGHT, CONTENT_WIDTH, ROW_HEIGHT, STRIPE));

    const mid = y - ROW_HEIGHT / 2;
    const base = y - 15;
    const firstOfDay = index === 0 || rows[index - 1].date !== row.date;
    if (firstOfDay) ops.push(text(M + 10, base, formatDate(row.date), 8.5, true, INK));
    ops.push(circle(126, mid, 3.5, MEAL_COLOR[row.meal]));
    ops.push(text(134, base, MEAL_LABEL[row.meal], 8.5, false, INK));
    ops.push(text(RECIPE_X, base, fitText(row.recipe, 8.5, RECIPE_WIDTH), 8.5, false, INK));
    ops.push(rightText(KCAL_EDGE, base, String(Math.round(row.kcal)), 8.5, false, INK));
    ops.push(rightText(PROTEIN_EDGE, base, `${row.proteinGrams}`, 8.5, false, INK));
    ops.push(rightText(CARBS_EDGE, base, `${row.carbsGrams}`, 8.5, false, INK));
    ops.push(rightText(FAT_EDGE, base, `${row.fatGrams}`, 8.5, false, INK));
    ops.push(endsDay ? line(M, W - M, y - ROW_HEIGHT, RULE_STRONG, 0.8) : line(M + 10, W - M, y - ROW_HEIGHT, RULE, 0.4));
    y -= ROW_HEIGHT;
  });

  if (rows.length > 0) {
    ensureSpace(ROW_HEIGHT + 4);
    y -= 4;
    ops.push(rect(M, y - ROW_HEIGHT, CONTENT_WIDTH, ROW_HEIGHT, HEAD_BG));
    const base = y - 15;
    ops.push(text(M + 10, base, "Week total", 8.5, true, INK));
    ops.push(rightText(KCAL_EDGE, base, grouped(totalKcal), 8.5, true, INK));
    ops.push(rightText(PROTEIN_EDGE, base, grouped(totalProtein), 8.5, true, INK));
    ops.push(rightText(CARBS_EDGE, base, grouped(totalCarbs), 8.5, true, INK));
    ops.push(rightText(FAT_EDGE, base, grouped(totalFat), 8.5, true, INK));
    y -= ROW_HEIGHT;
  }
  pages.push(ops);

  // Footers are added last, once the number of pages is known.
  const total = pages.length;
  const contents = pages.map((pageOps, index) => {
    const footer = [
      line(M, W - M, FOOTER_LINE, RULE, 0.6),
      text(M, FOOTER_LINE - 14, "NutriDay", 7.5, false, MUTED),
      rightText(W - M, FOOTER_LINE - 14, `Page ${index + 1} of ${total}`, 7.5, false, MUTED),
    ];
    return [...pageOps, ...footer].join("\n");
  });
  return buildPdf(contents);
}
