import { request } from "./http";
import type { AuthResponse, LoginInput, RegisterInput, UserSummary } from "../types/auth";

export const authApi = {
  register: (input: RegisterInput) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: input }),

  login: (input: LoginInput) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: input }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>("/auth/refresh", { method: "POST", body: { refreshToken } }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  me: (accessToken: string) =>
    request<UserSummary>("/users/me", { token: accessToken }),
};
