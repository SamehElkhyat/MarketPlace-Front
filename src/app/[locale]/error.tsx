"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { Link } from "@/i18n/navigation";

/** Designed error boundary: reports to Sentry, offers a retry, never shows a stack trace. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="page-container flex min-h-[70dvh] flex-col items-center justify-center gap-6 py-24 text-center" role="alert">
      <p className="eyebrow">{t("errors.generic")}</p>
      <h1 className="text-2xl">{t("errors.page.title")}</h1>
      <p className="max-w-md text-muted-foreground">{t("errors.page.body")}</p>
      {error.digest ? <p className="text-xs text-muted-foreground" dir="ltr">ref: {error.digest}</p> : null}
      <div className="flex gap-3">
        <Button size="lg" onClick={reset}>{t("errors.retry")}</Button>
        <Button asChild size="lg" variant="outline"><Link href="/">{t("errors.backHome")}</Link></Button>
      </div>
    </main>
  );
}
