"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocalizedRouter } from "@/i18n/navigation";
import { stripLocale } from "@/i18n/navigation";
import { isAdminRole, useAuthStore } from "@/stores/auth.store";

/**
 * Client-side route guard: shows a skeleton while the session is restored, then either renders or sends
 * the visitor to sign-in (remembering where they were going). The API enforces access independently —
 * this is only about UX, never security.
 */
export function AuthGuard({ children, requireAdmin = false }: { children: ReactNode; requireAdmin?: boolean }) {
  const router = useLocalizedRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=${encodeURIComponent(stripLocale(pathname))}`);
    if (status === "authenticated" && requireAdmin && !isAdminRole(role)) router.replace("/");
  }, [status, role, requireAdmin, pathname, router]);

  if (status !== "authenticated" || (requireAdmin && !isAdminRole(role))) {
    return (
      <div className="page-container space-y-4 py-12" aria-busy>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return <>{children}</>;
}
