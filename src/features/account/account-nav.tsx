"use client";

import { Heart, MapPin, Package, User } from "lucide-react";
import { useT } from "@/i18n/client";
import { Link, useBarePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AccountNav() {
  const t = useT();
  const pathname = useBarePathname();
  const items = [
    { href: "/account", label: t("account.profile"), icon: User, exact: true },
    { href: "/account/orders", label: t("nav.myOrders"), icon: Package, exact: false },
    { href: "/account/addresses", label: t("account.addresses"), icon: MapPin, exact: false },
    { href: "/account/wishlist", label: t("nav.wishlist"), icon: Heart, exact: false },
  ];
  return (
    <nav aria-label={t("nav.account")} className="scrollbar-none flex gap-1 overflow-x-auto md:flex-col">
      {items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm transition-colors",
              active ? "bg-card font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" strokeWidth={1.5} /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
