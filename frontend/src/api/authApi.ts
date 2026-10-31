import { request } from "./http";
import type {
  AuthResponse,
  LoginInput,
  PendingVerification,
  RegisterInput,
  ResetPasswordInput,
  UserSummary,
  VerifyEmailInput,
} from "../types/auth";

export const authApi = {
  register: (input: RegisterInput) =>
    request<PendingVerification>("/auth/register", { method: "POST", body: input }),

  verifyEmail: (input: VerifyEmailInput) =>
    request<AuthResponse>("/auth/verify-email", { method: "POST", body: input }),

  resendCode: (email: string) =>
    request<void>("/auth/resend-code", { method: "POST", body: { email } }),

  /** Google sign-in, step 1: sends the Google ID token; the backend emails a sign-in code. */
  googleSignIn: (idToken: string) =>
    request<PendingVerification>("/auth/google", { method: "POST", body: { idToken } }),

  /** Google sign-in, step 2: the emailed sign-in code gives the tokens. */
  googleVerify: (input: VerifyEmailInput) =>
    request<AuthResponse>("/auth/google/verify", { method: "POST", body: input }),

  googleResend: (email: string) =>
    request<void>("/auth/google/resend", { method: "POST", body: { email } }),

  login: (input: LoginInput) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: input }),

  refresh: (refreshToken: string) =>
    request<AuthResponse>("/auth/refresh", { method: "POST", body: { refreshToken } }),

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  /** Emails a 6-digit code to reset the password. Same answer for every email. */
  requestPasswordReset: (email: string) =>
    request<void>("/auth/password/forgot", { method: "POST", body: { email } }),

  /** Sets the new password with the emailed code. */
  resetPassword: (input: ResetPasswordInput) =>
    request<void>("/auth/password/reset", { method: "POST", body: input }),

  me: (accessToken: string) =>
    request<UserSummary>("/users/me", { token: accessToken }),
};
