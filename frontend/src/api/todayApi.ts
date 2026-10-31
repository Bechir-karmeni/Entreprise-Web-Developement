import { authedRequest } from "./authedRequest";
import type { TodayCoachNote, TodayData } from "../types/today";

export const todayApi = {
  /** The whole Today page for one day in one call. */
  get: (date: string) => authedRequest<TodayData>(`/today?date=${encodeURIComponent(date)}`),

  /** A short AI note about one day. Limited by a cooldown on the server. */
  coach: (date: string, language: "en" | "de") =>
    authedRequest<TodayCoachNote>("/today/coach", { method: "POST", body: { date, language } }),
};
