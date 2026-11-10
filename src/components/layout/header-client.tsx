"use client";

import { Heart, LogOut, Menu, Moon, Package, Search, ShoppingBag, Sun, User as UserIcon, LayoutDashboard } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CartDrawer } from "@/components/layout/cart-drawer";
import { MobileMenu } from "@/components/layout/mobile-menu";
import { SearchDialog } from "@/components/layout/search-dialog";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/features/auth/auth-api";
import { useCart } from "@/features/cart/use-cart";
import { useLocale, useT } from "@/i18n/client";
import { Link, useBarePathname, useLanguageSwitcher, useLocalizedRouter } from "@/i18n/navigation";
import { otherLocale } from "@/i18n/config";
import type { CategoryNode } from "@/lib/api/types";
import { pick } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isAdminRole, useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";

function LanguageSwitcher() {
  const locale = useLocale();
  const t = useT();
  const switchTo = useLanguageSwitcher();
  const next = otherLocale(locale);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => switchTo(next)}
      lang={next}
      aria-label={t("nav.switchLanguage")}
      className="px-3"
    >
      {next === "ar" ? "العربية" : "English"}
    </Button>
  );
}

function ThemeToggle() {
  const t = useT();
  const { resolvedTheme, setTheme } = useTheme();
  // false on the server and during hydration, true afterwards (avoids a theme-icon mismatch)
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon-sm" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={t("nav.toggleTheme")}>
      {dark ? <Sun strokeWidth={1.5} /> : <Moon strokeWidth={1.5} />}
    </Button>
  );
}

function AccountMenu() {
  const t = useT();
  const router = useLocalizedRouter();
  const { status, user } = useAuthStore();

  if (status !== "authenticated" || !user) {
    return (
      <Button variant="ghost" size="icon-sm" asChild aria-label={t("nav.signIn")}>
        <Link href="/login">
          <UserIcon strokeWidth={1.5} />
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={t("nav.account")}>
          <UserIcon strokeWidth={1.5} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-medium">{user.name}</span>
          <span className="block text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/account")}>
          <UserIcon /> {t("nav.myAccount")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/account/orders")}>
          <Package /> {t("nav.myOrders")}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/account/wishlist")}>
          <Heart /> {t("nav.wishlist")}
        </DropdownMenuItem>
        {isAdminRole(user.role) ? (
          <DropdownMenuItem onSelect={() => router.push("/admin")}>
            <LayoutDashboard /> {t("nav.admin")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await logout();
            router.push("/");
          }}
        >
          <LogOut /> {t("nav.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CartButton() {
  const t = useT();
  const locale = useLocale();
  const { itemCount } = useCart();
  const setCartOpen = useUiStore((s) => s.setCartOpen);
  return (
    <Button variant="ghost" size="icon-sm" className="relative" onClick={() => setCartOpen(true)} aria-label={t("nav.cart", { count: itemCount })}>
      <ShoppingBag strokeWidth={1.5} />
      {itemCount > 0 ? (
        <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[0.625rem] font-medium text-accent-foreground tabular-nums">
          {new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en").format(Math.min(itemCount, 99))}
        </span>
      ) : null}
    </Button>
  );
}

function MegaMenu({ node, onNavigate }: { node: CategoryNode; onNavigate: () => void }) {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="border-b border-border bg-background">
      <div className="page-container grid grid-cols-12 gap-6 py-8">
        <div className="col-span-3">
          <p className="eyebrow mb-3">{pick(node.name, locale)}</p>
          <Link href={`/c/${node.slug}`} onClick={onNavigate} className="text-sm underline underline-offset-4 decoration-border hover:decoration-foreground">
            {t("nav.viewAll", { name: pick(node.name, locale) })}
          </Link>
        </div>
        <div className="col-span-9 grid grid-cols-3 gap-6">
          {node.children.map((child) => (
            <div key={child.id}>
              <Link href={`/c/${node.slug}/${child.slug}`} onClick={onNavigate} className="mb-2 block text-sm font-medium hover:text-accent">
                {pick(child.name, locale)}
              </Link>
              <ul className="space-y-1.5">
                {child.children.map((leaf) => (
                  <li key={leaf.id}>
                    <Link
                      href={`/c/${node.slug}/${child.slug}/${leaf.slug}`}
                      onClick={onNavigate}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {pick(leaf.name, locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HeaderClient({ tree }: { tree: CategoryNode[] }) {
  const t = useT();
  const locale = useLocale();
  const pathname = useBarePathname();
  // The open menu is remembered with the path it was opened on, so it closes by itself after navigation.
  const [open_, setOpen_] = useState<{ id: string; path: string } | null>(null);
  const activeId = open_ && open_.path === pathname ? open_.id : null;
  const setActiveId = (id: string | null) => setOpen_(id ? { id, path: pathname } : null);
  const setSearchOpen = useUiStore((s) => s.setSearchOpen);
  const setMenuOpen = useUiStore((s) => s.setMenuOpen);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close the mega menu on Escape.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen_(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = (id: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setActiveId(id);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setActiveId(null), 120);
  };
  const active = tree.find((node) => node.id === activeId);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-sm" onMouseLeave={scheduleClose}>
        <div className="page-container flex h-16 items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon-sm" onClick={() => setMenuOpen(true)} aria-label={t("nav.menu")}>
              <Menu strokeWidth={1.5} />
            </Button>
          </div>

          <Link href="/" className="shrink-0 max-md:absolute max-md:start-1/2 max-md:-translate-x-1/2 max-md:rtl:translate-x-1/2" aria-label={t("nav.home")}>
            <Logo />
          </Link>

          <nav aria-label={t("nav.primary")} className="hidden flex-1 justify-center md:flex">
            <ul className="flex items-center gap-1">
              {tree.map((node) => (
                <li key={node.id} onMouseEnter={() => open(node.id)}>
                  <Link
                    href={`/c/${node.slug}`}
                    aria-expanded={activeId === node.id}
                    onFocus={() => open(node.id)}
                    className={cn(
                      "inline-flex h-16 items-center border-b-2 border-transparent px-3 text-sm transition-colors hover:text-foreground",
                      activeId === node.id ? "border-foreground text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {pick(node.name, locale)}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/collections/offers" className="inline-flex h-16 items-center px-3 text-sm text-accent hover:underline">
                  {t("nav.offers")}
                </Link>
              </li>
            </ul>
          </nav>

          <div className="flex flex-1 items-center justify-end gap-0.5 md:flex-none">
            <Button variant="ghost" size="icon-sm" onClick={() => setSearchOpen(true)} aria-label={t("nav.search")}>
              <Search strokeWidth={1.5} />
            </Button>
            <span className="hidden sm:inline-flex">
              <LanguageSwitcher />
            </span>
            <span className="hidden sm:inline-flex">
              <ThemeToggle />
            </span>
            <AccountMenu />
            <CartButton />
          </div>
        </div>

        {active && active.children.length > 0 ? (
          <div className="absolute inset-x-0 top-full hidden md:block" onMouseEnter={() => open(active.id)}>
            <MegaMenu node={active} onNavigate={() => setActiveId(null)} />
          </div>
        ) : null}
      </header>

      <MobileMenu tree={tree} />
      <SearchDialog />
      <CartDrawer />
    </>
  );
}
