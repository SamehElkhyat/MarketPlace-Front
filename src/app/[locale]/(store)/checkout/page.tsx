import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutClient } from "@/features/checkout/checkout-client";
import { getI18n } from "@/i18n/server";

// Client-gated page: no per-user prerender, so it may show a skeleton while the session loads.
export const instant = false;


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("checkout.title"), robots: { index: false, follow: false } };
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="page-container min-h-[70dvh]" aria-busy />}>
      <CheckoutClient />
    </Suspense>
  );
}
