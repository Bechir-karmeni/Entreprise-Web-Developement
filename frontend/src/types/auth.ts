export interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: UserSummary;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Returned after sign-up: the account exists but the email must be confirmed with the emailed code. */
export interface PendingVerification {
  email: string;
  codeValidSeconds: number;
  resendAfterSeconds: number;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  password: string;
  confirmPassword: string;
}
