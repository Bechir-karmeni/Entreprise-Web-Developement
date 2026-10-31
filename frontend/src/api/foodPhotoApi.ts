import { authedRequest } from "./authedRequest";
import type { FoodPhotoItem } from "../types/foodPhoto";

export const foodPhotoApi = {
  /** Finds the foods in a meal photo (JPEG, base64 without the data: prefix). Nothing is saved. */
  analyse: (input: { imageBase64: string; mimeType: "image/jpeg"; language: "en" | "de" }) =>
    authedRequest<FoodPhotoItem[]>("/food-photo/analyse", { method: "POST", body: input }),
};
