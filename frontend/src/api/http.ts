/** Error returned by the backend, with the message and optional per-field errors. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors?: Record<string, string>;

  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  token?: string;
}

/** Calls the backend under /api (proxied to http://localhost:8080 by Vite in development). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Make sure the backend is running on port 8080.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  // Vite's proxy answers with plain text (not JSON) when the backend is down.
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.message ??
        `Request failed (HTTP ${response.status}). Make sure the backend is running on port 8080 and check its console.`,
      data?.errors ?? undefined,
    );
  }
  return data as T;
}
