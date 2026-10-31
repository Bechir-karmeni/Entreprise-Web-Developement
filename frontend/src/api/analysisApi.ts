import { authedRequest } from "./authedRequest";
import type { AnalysisResult } from "../types/analysis";

export const analysisApi = {
  /** Asks the backend for an analysis of the last 30 days, written in the given language. */
  run: (language: "en" | "de") =>
    authedRequest<AnalysisResult>("/analysis", { method: "POST", body: { language } }),
};
