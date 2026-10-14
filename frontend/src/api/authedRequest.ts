import { authApi } from "./authApi";
import { ApiError, request } from "./http";
import { readSession, writeSession } from "../auth/session";

/**
 * Calls a protected endpoint with the stored access token.
 * If the token has expired (401), it uses the refresh token once and retries the request.
 */
export async function authedRequest<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const session = readSession();
  if (!session) {
    throw new ApiError(401, "Please log in again.");
  }
  try {
    return await request<T>(path, { ...options, token: session.accessToken });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error;
    }
    const refreshed = await authApi.refresh(session.refreshToken);
    writeSession(refreshed);
    return request<T>(path, { ...options, token: refreshed.accessToken });
  }
}
