import { useAuthStore } from "@/stores/auth.store";
import { ApiError, type ApiErrorCode } from "./errors";
import { buildQuery, type QueryParams } from "./query-string";
import type { AuthResponse } from "./types";

export interface ApiInit {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  headers?: Record<string, string>;
  /** Send the access token (default: yes when signed in). */
  auth?: boolean;
  /** Makes order placement safe to retry / double-click. */
  idempotencyKey?: string;
  signal?: AbortSignal;
}

interface ErrorBody {
  error?: { code?: ApiErrorCode; message?: string; details?: unknown; requestId?: string };
}

let refreshing: Promise<boolean> | null = null;

/**
 * Single-flight session refresh: if ten requests hit 401 together, ONE refresh call is made and the
 * others wait for it. (The server treats a re-used refresh token as theft, so parallel refreshes would
 * log the user out.)
 */
export function refreshSession(): Promise<boolean> {
  refreshing ??= performRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "same-origin" });
    if (!response.ok) {
      useAuthStore.getState().clear();
      return false;
    }
    const data = (await response.json()) as AuthResponse;
    useAuthStore.getState().setSession(data.accessToken, data.user);
    return true;
  } catch {
    useAuthStore.getState().clear();
    return false;
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // non-JSON error (e.g. proxy/gateway page)
  }
  const e = body.error;
  return new ApiError(response.status, e?.code ?? "INTERNAL", e?.message ?? response.statusText, e?.details, e?.requestId);
}

/**
 * Browser → storefront origin → (rewrite) → Express API.
 * Adds the bearer token and transparently refreshes it once on 401.
 */
export async function api<T = void>(path: string, init: ApiInit = {}, isRetry = false): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const headers: Record<string, string> = { Accept: "application/json", ...init.headers };
  if (init.body !== undefined) headers["Content-Type"] = "application/json";
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  if (accessToken && init.auth !== false) headers["Authorization"] = `Bearer ${accessToken}`;

  let response: Response;
  try {
    response = await fetch(`/api${path}${buildQuery(init.query)}`, {
      method: init.method ?? "GET",
      headers,
      credentials: "same-origin",
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      ...(init.signal ? { signal: init.signal } : {}),
    });
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK", "Network error");
  }

  if (response.status === 401 && !isRetry && accessToken && !path.startsWith("/auth/")) {
    if (await refreshSession()) return api<T>(path, init, true);
  }
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
