import type { ServerLunchSuggestion } from "../types/today";

/** What the popup should emphasise: the macro that is furthest behind for the day. */
export type LunchFocus = "protein" | "fiber" | "balanced";

/** The lunch suggestion as the popup shows it. The numbers come from the server. */
export interface LunchSuggestion {
  /** "targetReached" when the day has no calories left, so no lunch target is shown. */
  status: "suggested" | "targetReached";
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  focus: LunchFocus;
}

const FOCUS: Record<ServerLunchSuggestion["focus"], LunchFocus> = {
  PROTEIN: "protein",
  FIBER: "fiber",
  BALANCED: "balanced",
};

/** Converts the server's lunch suggestion (upper-case enums) into the shape the popup uses. */
export function toLunchSuggestion(server: ServerLunchSuggestion): LunchSuggestion {
  return {
    status: server.status === "SUGGESTED" ? "suggested" : "targetReached",
    calories: server.calories,
    proteinGrams: server.proteinGrams,
    carbsGrams: server.carbsGrams,
    fatGrams: server.fatGrams,
    fiberGrams: server.fiberGrams,
    focus: FOCUS[server.focus],
  };
}
