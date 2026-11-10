"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ExternalLink,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Package,
  ScrollText,
  ShoppingCart,
  Tag,
  Ticket,
  Truck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AuthGuard } from "@/features/account/auth-guard";
import { logout } from "@/features/auth/auth-api";
import { useDir, useLocale, useT } from "@/i18n/client";
import { otherLocale } from "@/i18n/config";
import { Link, useBarePathname, useLanguageSwitcher, useLocalizedRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import { useAuthStore } from "@/stores/auth.store";

export const useIsReadOnly = () => useAuthStore((s) => s.user?.role === "demo_admin");

function NewOrdersBadge() {
  /**
   * Vercel Functions have no WebSockets, so the "new orders" counter simply polls a cheap endpoint every 30 s.
   */
  const { data } = useQuery({
    queryKey: ["admin", "new-count"],
    queryFn: () => api<{ pending: number }>("/admin/orders/new-count"),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  if (!data?.pending) return null;
  return <SidebarMenuBadge className="bg-accent text-accent-foreground">{data.pending}</SidebarMenuBadge>;
}

function AdminSidebar() {
  const t = useT();
  const dir = useDir();
  const pathname = useBarePathname();
  const router = useLocalizedRouter();
  const user = useAuthStore((s) => s.user);

  const groups = [
    {
      label: t("admin.nav.overview"),
      items: [{ href: "/admin", label: t("admin.nav.dashboard"), icon: LayoutDashboard, exact: true }],
    },
    {
      label: t("admin.nav.sales"),
      items: [
        { href: "/admin/orders", label: t("admin.nav.orders"), icon: ShoppingCart, badge: true },
        { href: "/admin/customers", label: t("admin.nav.customers"), icon: Users },
        { href: "/admin/coupons", label: t("admin.nav.coupons"), icon: Ticket },
        { href: "/admin/shipping", label: t("admin.nav.shipping"), icon: Truck },
      ],
    },
    {
      label: t("admin.nav.catalog"),
      items: [
        { href: "/admin/products", label: t("admin.nav.products"), icon: Package },
        { href: "/admin/categories", label: t("admin.nav.categories"), icon: Layers },
        { href: "/admin/brands", label: t("admin.nav.brands"), icon: Tag },
        { href: "/admin/collections", label: t("admin.nav.collections"), icon: Library },
        { href: "/admin/inventory", label: t("admin.nav.inventory"), icon: Boxes },
      ],
    },
    { label: t("admin.nav.system"), items: [{ href: "/admin/audit", label: t("admin.nav.audit"), icon: ScrollText }] },
  ];

  return (
    <Sidebar side={dir === "rtl" ? "right" : "left"} collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/admin"><Logo /></Link>
        <span className="text-xs text-muted-foreground">{t("admin.title")}</span>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = "exact" in item && item.exact ? pathname === item.href : pathname.startsWith(item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link href={item.href}><item.icon /> <span>{item.label}</span></Link>
                      </SidebarMenuButton>
                      {"badge" in item && item.badge ? <NewOrdersBadge /> : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="gap-3 border-t border-sidebar-border p-4">
        <div className="text-xs">
          <p className="font-medium">{user?.name}</p>
          <p className="text-muted-foreground" dir="ltr">{user?.email}</p>
        </div>
        <Button variant="outline" size="sm" asChild><Link href="/"><ExternalLink /> {t("admin.viewStore")}</Link></Button>
        <Button variant="ghost" size="sm" onClick={async () => { await logout(); router.push("/"); }}><LogOut /> {t("nav.signOut")}</Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function AdminTopbar() {
  const t = useT();
  const locale = useLocale();
  const switchTo = useLanguageSwitcher();
  const readOnly = useIsReadOnly();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      <SidebarTrigger aria-label={t("nav.menu")} />
      <Separator orientation="vertical" className="h-5" />
      {readOnly ? <Badge variant="accent">{t("admin.readOnly")}</Badge> : null}
      <div className="ms-auto">
        <Button variant="ghost" size="sm" lang={otherLocale(locale)} onClick={() => switchTo(otherLocale(locale))}>
          {otherLocale(locale) === "ar" ? "العربية" : "English"}
        </Button>
      </div>
    </header>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className="min-w-0 bg-background">
          <AdminTopbar />
          <div className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  );
}
