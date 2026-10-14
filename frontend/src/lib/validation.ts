import type { LoginInput, RegisterInput } from "../types/auth";

/**
 * Client-side checks that mirror the backend rules.
 * They give fast feedback only; the backend always validates again.
 */
export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 255;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72;

export function validateRequiredName(value: string, label: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > NAME_MAX_LENGTH) return `${label} must be at most ${NAME_MAX_LENGTH} characters.`;
  return null;
}

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (trimmed.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return "Password is required.";
  if (value.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (value.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Use at least one letter and one digit.";
  return null;
}

export function validateTerms(accepted: boolean): string | null {
  return accepted ? null : "Please accept the Terms of Service and Privacy Policy to continue.";
}

export function validateRegister(values: RegisterInput): FieldErrors<RegisterInput> {
  const errors: FieldErrors<RegisterInput> = {};
  const firstName = validateRequiredName(values.firstName, "First name");
  const lastName = validateRequiredName(values.lastName, "Last name");
  const email = validateEmail(values.email);
  const password = validatePassword(values.password);

  if (firstName) errors.firstName = firstName;
  if (lastName) errors.lastName = lastName;
  if (email) errors.email = email;
  if (password) errors.password = password;
  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateLogin(values: LoginInput): FieldErrors<LoginInput> {
  const errors: FieldErrors<LoginInput> = {};
  const email = validateEmail(values.email);
  if (email) errors.email = email;
  if (!values.password) errors.password = "Password is required.";
  return errors;
}

export interface PasswordStrength {
  /** Number of passed checks, 0 to 4. */
  score: number;
  label: string;
}

/** Scores a password on four checks, shown as the four strength bars in the design. */
export function getPasswordStrength(password: string): PasswordStrength {
  const checks = [
    password.length >= PASSWORD_MIN_LENGTH,
    /[A-Za-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label =
    score === 4
      ? "Strong password (8+ chars, numbers & symbols)"
      : score === 3
        ? "Good password"
        : score === 2
          ? "Fair password"
          : "Weak password";
  return { score, label };
}
