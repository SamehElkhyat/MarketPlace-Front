import "server-only";
import { ApiError, type ApiErrorCode } from "./errors";
import { buildQuery, type QueryParams } from "./query-string";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

/**
 * Server-side GET straight to the API (no browser, no rewrite hop). Used by the cached data loaders in
 * `lib/data/*` — the public catalogue needs no authentication, so results can be shared across users.
 */
export async function serverGet<T>(path: string, query?: QueryParams): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api${path}${buildQuery(query)}`, {
      headers: { Accept: "application/json" },
      // Never hang a render on a sick backend.
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(0, "NETWORK", `API unreachable at ${BACKEND_URL}`);
  }

  if (!response.ok) {
    let body: { error?: { code?: ApiErrorCode; message?: string } } = {};
    try {
      body = await response.json();
    } catch {
      // ignore
    }
    throw new ApiError(response.status, body.error?.code ?? "INTERNAL", body.error?.message ?? response.statusText);
  }
  return (await response.json()) as T;
}

/** Like `serverGet` but resolves to `null` on 404 so pages can call `notFound()`. */
export async function serverGetOrNull<T>(path: string, query?: QueryParams): Promise<T | null> {
  try {
    return await serverGet<T>(path, query);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}
