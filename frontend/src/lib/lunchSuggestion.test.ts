import { describe, expect, it } from "vitest";
import { toLunchSuggestion } from "./lunchSuggestion";
import type { ServerLunchSuggestion } from "../types/today";

const server: ServerLunchSuggestion = {
  status: "SUGGESTED",
  calories: 650,
  proteinGrams: 42,
  carbsGrams: 70,
  fatGrams: 21,
  fiberGrams: 9,
  focus: "PROTEIN",
};

describe("toLunchSuggestion", () => {
  it("keeps the numbers the server sent", () => {
    const result = toLunchSuggestion(server);
    expect(result.calories).toBe(650);
    expect(result.proteinGrams).toBe(42);
    expect(result.carbsGrams).toBe(70);
    expect(result.fatGrams).toBe(21);
    expect(result.fiberGrams).toBe(9);
  });

  it("maps the upper-case status and focus to the lower-case values the popup uses", () => {
    expect(toLunchSuggestion(server).status).toBe("suggested");
    expect(toLunchSuggestion(server).focus).toBe("protein");
    expect(toLunchSuggestion({ ...server, focus: "FIBER" }).focus).toBe("fiber");
    expect(toLunchSuggestion({ ...server, focus: "BALANCED" }).focus).toBe("balanced");
  });

  it("maps a reached calorie target to targetReached", () => {
    const result = toLunchSuggestion({ ...server, status: "TARGET_REACHED", calories: 0 });
    expect(result.status).toBe("targetReached");
    expect(result.calories).toBe(0);
  });
});
