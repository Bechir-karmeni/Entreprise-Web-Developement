import { authedRequest } from "./authedRequest";
import type { WaterDay, WaterIntakeInput } from "../types/water";

export const waterApi = {
  get: (date: string) => authedRequest<WaterDay>(`/water?date=${encodeURIComponent(date)}`),

  add: (input: WaterIntakeInput) => authedRequest<WaterDay>("/water", { method: "POST", body: input }),

  remove: (id: string) => authedRequest<void>(`/water/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
