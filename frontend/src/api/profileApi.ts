import { authedRequest } from "./authedRequest";
import type { ProfileInput, ProfileResponse } from "../types/profile";

export const profileApi = {
  get: () => authedRequest<ProfileResponse>("/profile"),

  save: (input: ProfileInput) => authedRequest<ProfileResponse>("/profile", { method: "PUT", body: input }),
};
