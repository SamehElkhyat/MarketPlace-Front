import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, locales, type Locale } from "@/i18n/config";

/** Picks the best supported language from the `Accept-Language` header (e.g. `ar-EG,ar;q=0.9,en;q=0.8`). */
function fromAcceptLanguage(header: string | null): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag = "", q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase().split("-")[0] ?? "", q: q ? Number(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.map((r) => r.tag).find(isLocale) ?? null;
}

/**
 * Locale routing: `/` and any path without a language prefix redirect to `/ar/…` or `/en/…`
 * (saved choice → browser language → default).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (locales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) return;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : (fromAcceptLanguage(request.headers.get("accept-language")) ?? defaultLocale);

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, the API rewrite, the revalidation hook and anything that looks like a file.
  matcher: ["/((?!_next|api|revalidate|.*\\..*).*)"],
};
