import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/admin-shell";

// The back office is private: never indexed, never cached.
// Private, client-gated area (the session lives in memory + an httpOnly cookie, so there is nothing to prerender
// per user). Navigations here are allowed to show a skeleton instead of an instant shell.
export const instant = false;

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
