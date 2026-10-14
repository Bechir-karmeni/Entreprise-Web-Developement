import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/authApi";
import { ApiError } from "../api/http";
import type { AuthResponse, LoginInput, RegisterInput, UserSummary } from "../types/auth";
import { readSession, writeSession } from "./session";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  user: UserSummary | null;
  status: AuthStatus;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const applyResponse = useCallback((response: AuthResponse) => {
    writeSession(response);
    setUser(response.user);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    writeSession(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  // On startup, restore the session. If the access token has expired, use the refresh token once.
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const session = readSession();
      if (!session) {
        setStatus("anonymous");
        return;
      }
      try {
        const current = await authApi.me(session.accessToken);
        if (!cancelled) {
          setUser(current);
          setStatus("authenticated");
        }
        return;
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          // Backend not reachable: keep the stored session and show the app.
          if (!cancelled) setStatus("anonymous");
          return;
        }
      }
      try {
        const refreshed = await authApi.refresh(session.refreshToken);
        if (!cancelled) applyResponse(refreshed);
      } catch {
        if (!cancelled) clearSession();
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, [applyResponse, clearSession]);

  const login = useCallback(async (input: LoginInput) => {
    applyResponse(await authApi.login(input));
  }, [applyResponse]);

  const register = useCallback(async (input: RegisterInput) => {
    applyResponse(await authApi.register(input));
  }, [applyResponse]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
