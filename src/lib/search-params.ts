import {
  createLoader,
  createSerializer,
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

export const SORT_OPTIONS = ["newest", "price_asc", "price_desc", "bestselling", "rating"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/**
 * The URL is the single source of truth for listing state, so any filtered view is a shareable link.
 *   /ar/c/fashion?attr=size:M,color:black&brand=atelier-nile&minPrice=500&sort=price_asc&page=2
 * Prices in the URL are whole EGP (human readable); the API takes piasters.
 */
export const listingParsers = {
  q: parseAsString,
  brand: parseAsArrayOf(parseAsString),
  attr: parseAsArrayOf(parseAsString),
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  rating: parseAsInteger,
  inStock: parseAsBoolean,
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault("newest"),
  page: parseAsInteger.withDefault(1),
};

export const loadListingParams = createLoader(listingParsers);
export const serializeListingParams = createSerializer(listingParsers);

export type ListingParams = ReturnType<typeof loadListingParams> extends Promise<infer T> ? T : never;
