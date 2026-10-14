import { authedRequest } from "./authedRequest";
import type { ProfileResponse } from "../types/profile";

export const profileApi = {
  get: () => authedRequest<ProfileResponse>("/profile"),
};
