import { Suspense, type ReactNode } from "react";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getI18n } from "@/i18n/server";

function HeaderFallback() {
  return <div className="sticky top-0 z-40 h-16 border-b border-border bg-background" aria-hidden />;
}

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {t("nav.skipToContent")}
      </a>
      <Suspense fallback={<HeaderFallback />}>
        <SiteHeader />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <Suspense fallback={null}>
        <SiteFooter />
      </Suspense>
    </div>
  );
}
