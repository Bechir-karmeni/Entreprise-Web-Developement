import { authedRequest } from "./authedRequest";
import type { TargetsResponse } from "../types/nutrition";

export const nutritionApi = {
  getTargets: () => authedRequest<TargetsResponse>("/profile/targets"),
};
