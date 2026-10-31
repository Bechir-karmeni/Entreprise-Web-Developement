import { authedRequest } from "./authedRequest";
import type { AnalysisResult } from "../types/analysis";

export const summaryApi = {
  /** Asks the backend for a short summary of the last 7 days, written in the given language. */
  run: (language: "en" | "de") => authedRequest<AnalysisResult>("/summary", { method: "POST", body: { language } }),
};
