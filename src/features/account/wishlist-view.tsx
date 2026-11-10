"use client";

import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ProductCard, ProductCardSkeleton } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/features/wishlist/use-wishlist";
import { useLocale, useT } from "@/i18n/client";
import { Link } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { ProductCardData } from "@/lib/api/types";

export function WishlistView() {
  const t = useT();
  const locale = useLocale();
  const { ids } = useWishlist();
  const query = useQuery({
    queryKey: ["wishlist", [...ids].sort().join(",")],
    queryFn: async () => (await api<{ items: ProductCardData[] }>("/users/me/wishlist")).items,
    placeholderData: (previous) => previous,
  });

  return (
    <div className="space-y-8">
      <h1 className="text-xl">{t("nav.wishlist")}</h1>
      {query.isPending ? (
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : query.data && query.data.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6">
          {query.data.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} locale={locale} t={t} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Heart}
          title={t("wishlist.empty.title")}
          description={t("wishlist.empty.description")}
          action={
            <Button asChild>
              <Link href="/collections/new-arrivals">{t("cart.empty.cta")}</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
