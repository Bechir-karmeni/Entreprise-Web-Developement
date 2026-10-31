import { authedRequest } from "./authedRequest";
import type { AnalysisResult } from "../types/analysis";

export const copilotApi = {
  /** Macro guidance from the last 14 days, written in the given language. */
  macros: (language: "en" | "de") =>
    authedRequest<AnalysisResult>("/copilot/macros", { method: "POST", body: { language } }),
};
