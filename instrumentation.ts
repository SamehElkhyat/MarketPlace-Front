import * as Sentry from "@sentry/nextjs";

/** Server-side error tracking for RSC/route-handler failures. A no-op unless SENTRY_DSN is set. */
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) Sentry.init({ dsn, environment: process.env.NODE_ENV, tracesSampleRate: 0.1 });
}

export const onRequestError = Sentry.captureRequestError;
