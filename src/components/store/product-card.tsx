import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/shared/price";
import { RatingStars } from "@/components/shared/rating-stars";
import { WishlistButton } from "@/components/store/wishlist-button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/config";
import type { Translate } from "@/i18n/translate";
import type { ProductCardData } from "@/lib/api/types";
import { formatNumber, pick } from "@/lib/format";

interface ProductCardProps {
  product: ProductCardData;
  locale: Locale;
  t: Translate;
  /** Above-the-fold cards load eagerly (better LCP). */
  priority?: boolean;
  sizes?: string;
}

/**
 * Listing card: consistent 4:5 imagery, a second photo on hover, a quiet price line.
 * Rendered on the server; only the wishlist heart and the price formatter hydrate.
 */
export function ProductCard({ product, locale, t, priority = false, sizes = "(min-width: 1024px) 25vw, 50vw" }: ProductCardProps) {
  const title = pick(product.title, locale);
  const [first, second] = product.images;
  const priceVaries = product.maxPrice > product.minPrice;

  return (
    <article className="group relative">
      <Link href={`/products/${product.slug}`} className="block" aria-label={title}>
        <div className="media-4x5">
          {first ? (
            <Image
              src={first.url}
              alt={first.alt ?? title}
              fill
              sizes={sizes}
              priority={priority}
              className="object-cover transition-opacity duration-300 ease-out"
            />
          ) : null}
          {second ? (
            <Image
              src={second.url}
              alt=""
              fill
              sizes={sizes}
              aria-hidden
              className="object-cover opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100 group-focus-within:opacity-100"
            />
          ) : null}

          <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-1">
              {!product.inStock ? <Badge variant="outline" className="bg-background text-foreground">{t("product.soldOut")}</Badge> : null}
              {product.onSale && product.inStock ? <Badge variant="outline" className="border-accent bg-background text-accent">{t("product.sale")}</Badge> : null}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-2 font-sans text-sm font-normal tracking-normal text-foreground">{title}</h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {priceVaries ? <span className="text-xs text-muted-foreground">{t("product.from")}</span> : null}
            <Price amount={product.minPrice} size="sm" />
          </div>
          {product.ratingCount > 0 ? (
            <RatingStars
              value={product.ratingAvg}
              count={formatNumber(product.ratingCount, locale)}
              label={t("product.ratingLabel", { value: product.ratingAvg })}
            />
          ) : null}
        </div>
      </Link>

      <WishlistButton
        productId={product.id}
        className="absolute end-2 top-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 max-md:opacity-100"
      />
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="media-4x5 animate-pulse" />
      <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
      <div className="h-4 w-1/3 animate-pulse rounded-sm bg-muted" />
    </div>
  );
}
