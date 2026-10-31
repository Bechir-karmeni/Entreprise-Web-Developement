import { authedRequest } from "./authedRequest";
import type { WeightEntry, WeightInput } from "../types/weight";

export const weightApi = {
  list: (from: string, to: string) =>
    authedRequest<WeightEntry[]>(`/weight?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),

  save: (input: WeightInput) => authedRequest<WeightEntry>("/weight", { method: "PUT", body: input }),

  remove: (id: string) => authedRequest<void>(`/weight/${encodeURIComponent(id)}`, { method: "DELETE" }),
};
