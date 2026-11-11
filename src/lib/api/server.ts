import "server-only";
import { ApiError, type ApiErrorCode } from "./errors";
import { buildQuery, type QueryParams } from "./query-string";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://localhost:4000").replace(/\/$/, "");

/** On Vercel a missing BACKEND_URL silently falls back to localhost; fail early with a message that says so. */
if (process.env.VERCEL && !process.env.BACKEND_URL) {
  throw new Error(
    "BACKEND_URL is not set. Add it in Vercel → Project → Settings → Environment Variables (the deployed API URL).",
  );
}

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
    throw new ApiError(0, "NETWORK", `API unreachable at ${BACKEND_URL} (GET /api${path})`);
  }

  if (!response.ok) {
    // Read as text first: a crashing function answers with a plain-text/HTML page, not our JSON error shape.
    const raw = await response.text().catch(() => "");
    let body: { error?: { code?: ApiErrorCode; message?: string } } = {};
    try {
      body = JSON.parse(raw);
    } catch {
      // not JSON
    }
    const detail = body.error?.message ?? (raw.trim().slice(0, 160) || response.statusText);
    throw new ApiError(
      response.status,
      body.error?.code ?? "INTERNAL",
      `Backend ${BACKEND_URL} answered ${response.status} for GET /api${path}: ${detail}`,
    );
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
