import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterView } from "@/features/auth/auth-views";
import { getI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  // Account pages are private — never indexed.
  return { title: t("auth.registerTitle"), robots: { index: false, follow: false } };
}

export default function Page() {
  // useSearchParams() needs a Suspense boundary under Cache Components.
  return (
    <Suspense fallback={<div className="page-container min-h-[70dvh]" aria-busy />}>
      <RegisterView />
    </Suspense>
  );
}
