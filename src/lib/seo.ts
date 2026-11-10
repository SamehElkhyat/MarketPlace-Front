import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { SITE_URL } from "@/lib/site";

/** Canonical + hreflang alternates for a locale-less `path` (e.g. `/c/fashion`). */
export function localizedAlternates(path: string, locale: Locale): Metadata["alternates"] {
  const suffix = path === "/" ? "" : path;
  return {
    canonical: `${SITE_URL}/${locale}${suffix}`,
    languages: {
      ...Object.fromEntries(locales.map((l) => [l, `${SITE_URL}/${l}${suffix}`])),
      "x-default": `${SITE_URL}/ar${suffix}`,
    },
  };
}

/** Escapes `<` so JSON-LD can't break out of its <script> tag. */
export const jsonLd = (data: unknown): string => JSON.stringify(data).replace(/</g, "\\u003c");
