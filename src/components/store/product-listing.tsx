import { PackageSearch } from "lucide-react";
import type { SearchParams } from "nuqs/server";
import { EmptyState } from "@/components/shared/empty-state";
import { ActiveFilters, ListingFilters, MobileFilters, SortSelect } from "@/components/store/listing-filters";
import { ListingPagination } from "@/components/store/listing-pagination";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";
import { buildQuery } from "@/lib/api/query-string";
import { getProductList } from "@/lib/data/catalog";
import { formatNumber } from "@/lib/format";
import { loadListingParams } from "@/lib/search-params";

export interface ListingScope {
  category?: string;
  brand?: string;
  collection?: string;
}

interface ProductListingProps {
  scope: ListingScope;
  /** Path (without locale) used for pagination links, e.g. `/c/fashion`. */
  basePath: string;
  searchParams: Promise<SearchParams>;
}

const PAGE_SIZE = 24;
const toPiasters = (egp: number | null) => (egp == null ? undefined : egp * 100);

/**
 * Server-rendered results: the URL's filters are translated to one API call (cached per distinct query),
 * the grid is plain HTML for SEO, and only the filter widgets hydrate.
 */
export async function ProductListing({ scope, basePath, searchParams }: ProductListingProps) {
  const [{ t, locale }, params] = await Promise.all([getI18n(), loadListingParams(searchParams)]);

  const queryString = buildQuery({
    ...scope,
    q: params.q,
    // a brand page fixes the brand — URL brand filters don't apply there
    brand: scope.brand ? undefined : params.brand?.join(","),
    attr: params.attr ?? undefined,
    minPrice: toPiasters(params.minPrice),
    maxPrice: toPiasters(params.maxPrice),
    rating: params.rating ?? undefined,
    inStock: params.inStock ?? undefined,
    sort: params.sort === "newest" ? undefined : params.sort,
    page: params.page > 1 ? params.page : undefined,
    limit: PAGE_SIZE,
  });

  const data = await getProductList(queryString);
  const hideBrands = Boolean(scope.brand);

  return (
    <div className="page-grid gap-y-8">
      <aside className="hidden lg:col-span-3 lg:block" aria-label={t("listing.filters")}>
        <ListingFilters facets={data.facets} hideBrands={hideBrands} className="sticky top-24" />
      </aside>

      <div className="col-span-4 md:col-span-12 lg:col-span-9">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-border pb-4">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("listing.results", { count: data.total })}
          </p>
          <div className="flex items-center gap-2">
            <MobileFilters facets={data.facets} total={data.total} hideBrands={hideBrands} />
            <SortSelect />
          </div>
        </div>

        <ActiveFilters facets={data.facets} />

        {data.items.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title={t("listing.empty.title")}
            description={t("listing.empty.description")}
            action={
              <Button asChild variant="outline">
                <Link href={basePath}>{t("listing.clearAll")}</Link>
              </Button>
            }
          />
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6">
              {data.items.map((product, index) => (
                <li key={product.id}>
                  <ProductCard product={product} locale={locale} t={t} priority={index < 4} sizes="(min-width: 1024px) 22vw, 50vw" />
                </li>
              ))}
            </ul>
            <ListingPagination
              basePath={basePath}
              page={data.page}
              totalPages={data.totalPages}
              params={params}
              label={t("listing.pagination", { page: formatNumber(data.page, locale), total: formatNumber(data.totalPages, locale) })}
              prevLabel={t("common.previous")}
              nextLabel={t("common.next")}
            />
          </>
        )}
      </div>
    </div>
  );
}
