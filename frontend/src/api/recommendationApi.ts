import { authedRequest } from "./authedRequest";
import type { FridgeItem, FridgeRecommendation, PromptRecommendation } from "../types/recommendation";

export const recommendationApi = {
  fromPrompt: (text: string) =>
    authedRequest<PromptRecommendation>("/recommendations/prompt", { method: "POST", body: { text } }),
  fromFridge: () => authedRequest<FridgeRecommendation>("/recommendations/fridge"),
};

export const fridgeApi = {
  list: () => authedRequest<FridgeItem[]>("/fridge"),
  add: (name: string) => authedRequest<FridgeItem>("/fridge", { method: "POST", body: { name } }),
  remove: (id: string) => authedRequest<void>(`/fridge/${id}`, { method: "DELETE" }),
};
