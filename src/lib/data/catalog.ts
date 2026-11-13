import { cacheLife, cacheTag } from "next/cache";
import { ApiError } from "@/lib/api/errors";
import { serverGet, serverGetOrNull } from "@/lib/api/server";
import type {
  Brand,
  CategoryDetails,
  CategoryNode,
  Collection,
  ProductCardData,
  ProductDetailsResponse,
  ProductListResponse,
} from "@/lib/api/types";

/**
 * Cached public catalogue loaders.
 *
 * Each function is cached by the framework (keyed by its arguments) and tagged, so when a product is
 * edited the API calls `/revalidate` and only the affected entries are refreshed — pages stay static
 * and fast without ever serving stale prices for long.
 */

const isBuildPhase = () => process.env["NEXT_PHASE"] === "phase-production-build";

/**
 * `next build` prerenders pages, which needs the API. If it is down or broken at that moment (first deploy,
 * backend redeploying, wrong BACKEND_URL) that must not take the whole STOREFRONT build down with it.
 * During the build ONLY, an unreachable/5xx API yields `fallback` with a lifetime of seconds, so the
 * placeholder is never kept: the first real request re-fetches from the API. At runtime errors still surface
 * (error boundary + Sentry) — a live outage must not be silently shown as an empty shop.
 */
async function withBuildFallback<T>(fallback: T, load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    const apiDown = error instanceof ApiError && (error.status === 0 || error.status >= 500);
    if (!isBuildPhase() || !apiDown) throw error;
    console.warn(`[build] API unavailable, continuing with an empty placeholder: ${error.message}`);
    cacheLife({ stale: 0, revalidate: 1, expire: 30 });
    return fallback;
  }
}

const EMPTY_PRODUCT_LIST: ProductListResponse = {
  items: [],
  page: 1,
  limit: 24,
  total: 0,
  totalPages: 0,
  facets: { brands: [], attributes: [], price: null },
};

export async function getCategoryTree(): Promise<CategoryNode[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return withBuildFallback([], async () => (await serverGet<{ items: CategoryNode[] }>("/categories")).items);
}

export async function getCategoryDetails(slug: string): Promise<CategoryDetails | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return serverGetOrNull<CategoryDetails>(`/categories/${encodeURIComponent(slug)}`);
}

export async function getBrands(): Promise<Brand[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("brands");
  return withBuildFallback([], async () => (await serverGet<{ items: Brand[] }>("/brands")).items);
}

export async function getBrand(slug: string): Promise<Brand | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("brands");
  const data = await serverGetOrNull<{ brand: Brand }>(`/brands/${encodeURIComponent(slug)}`);
  return data?.brand ?? null;
}

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections");
  return withBuildFallback([], async () => (await serverGet<{ items: Collection[] }>("/collections")).items);
}

export async function getCollectionDetails(
  slug: string,
): Promise<{ collection: Collection; preview: ProductCardData[] } | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections", "products");
  return withBuildFallback(null, () => serverGetOrNull(`/collections/${encodeURIComponent(slug)}`));
}

/** `queryString` is the normalised, sorted query (so equal filters share one cache entry). */
export async function getProductList(queryString: string): Promise<ProductListResponse> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return withBuildFallback(EMPTY_PRODUCT_LIST, () => serverGet<ProductListResponse>(`/products${queryString}`));
}

export async function getProduct(slug: string): Promise<ProductDetailsResponse | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("products", `product:${slug}`);
  return serverGetOrNull<ProductDetailsResponse>(`/products/${encodeURIComponent(slug)}`);
}

/** Used by the sitemap — slugs only, cached for a day. */
export async function getAllProductSlugs(): Promise<{ slug: string; updatedAt?: string }[]> {
  "use cache";
  cacheLife("days");
  cacheTag("products");
  return withBuildFallback([], async () => {
    const slugs: { slug: string; updatedAt?: string }[] = [];
    for (let page = 1; page <= 20; page++) {
      const data = await serverGet<ProductListResponse>("/products?limit=60&page=" + page);
      slugs.push(...data.items.map((p) => ({ slug: p.slug })));
      if (page >= data.totalPages) break;
    }
    return slugs;
  });
}
