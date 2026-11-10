import { cacheLife, cacheTag } from "next/cache";
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

export async function getCategoryTree(): Promise<CategoryNode[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return (await serverGet<{ items: CategoryNode[] }>("/categories")).items;
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
  return (await serverGet<{ items: Brand[] }>("/brands")).items;
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
  return (await serverGet<{ items: Collection[] }>("/collections")).items;
}

export async function getCollectionDetails(
  slug: string,
): Promise<{ collection: Collection; preview: ProductCardData[] } | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("collections", "products");
  return serverGetOrNull(`/collections/${encodeURIComponent(slug)}`);
}

/** `queryString` is the normalised, sorted query (so equal filters share one cache entry). */
export async function getProductList(queryString: string): Promise<ProductListResponse> {
  "use cache";
  cacheLife("minutes");
  cacheTag("products");
  return serverGet<ProductListResponse>(`/products${queryString}`);
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
  const slugs: { slug: string; updatedAt?: string }[] = [];
  for (let page = 1; page <= 20; page++) {
    const data = await serverGet<ProductListResponse>("/products?limit=60&page=" + page);
    slugs.push(...data.items.map((p) => ({ slug: p.slug })));
    if (page >= data.totalPages) break;
  }
  return slugs;
}
