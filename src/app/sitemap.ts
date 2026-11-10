import type { MetadataRoute } from "next";
import { locales } from "@/i18n/config";
import { getAllProductSlugs, getBrands, getCategoryTree, getCollections } from "@/lib/data/catalog";
import type { CategoryNode } from "@/lib/api/types";
import { SITE_URL } from "@/lib/site";

const flatten = (nodes: CategoryNode[], prefix: string[] = []): string[] =>
  nodes.flatMap((n) => [[...prefix, n.slug].join("/"), ...flatten(n.children, [...prefix, n.slug])]);

/** Every public URL in both languages, with hreflang alternates so search engines pair the translations. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [tree, brands, collections, products] = await Promise.all([getCategoryTree(), getBrands(), getCollections(), getAllProductSlugs()]);

  const paths = [
    { path: "", priority: 1 },
    { path: "/brands", priority: 0.5 },
    ...flatten(tree).map((p) => ({ path: `/c/${p}`, priority: 0.8 })),
    ...brands.map((b) => ({ path: `/brands/${b.slug}`, priority: 0.5 })),
    ...collections.map((c) => ({ path: `/collections/${c.slug}`, priority: 0.7 })),
    ...products.map((p) => ({ path: `/products/${p.slug}`, priority: 0.9 })),
  ];

  return paths.flatMap(({ path, priority }) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: "daily" as const,
      priority,
      alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${path}`])) },
    })),
  );
}
