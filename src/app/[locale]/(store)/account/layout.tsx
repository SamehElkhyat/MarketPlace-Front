import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AccountNav } from "@/features/account/account-nav";
import { AuthGuard } from "@/features/account/auth-guard";

// Private, client-gated area (the session lives in memory + an httpOnly cookie, so there is nothing to prerender
// per user). Navigations here are allowed to show a skeleton instead of an instant shell.
export const instant = false;

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <div className="page-container py-10 md:py-16">
        <div className="grid gap-8 md:grid-cols-[14rem_1fr] md:gap-12">
          <AccountNav />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </AuthGuard>
  );
}
