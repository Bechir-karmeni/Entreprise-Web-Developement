import type { AuthResponse } from "../types/auth";

/**
 * Tokens are kept in localStorage so a page reload keeps the user signed in.
 * Trade-off for the report: localStorage is readable by injected scripts (XSS).
 * A production system would use httpOnly cookies; this is a documented limitation.
 */
const STORAGE_KEY = "dailyTracker.session";

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
}

export function readSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

export function writeSession(response: AuthResponse | null): void {
  try {
    if (response) {
      const session: StoredSession = { accessToken: response.accessToken, refreshToken: response.refreshToken };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be blocked (private mode). The user is then signed in for this page only.
  }
}
