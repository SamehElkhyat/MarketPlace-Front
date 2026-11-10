"use client";

import NextLink from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, type ComponentProps } from "react";
import { isLocale, LOCALE_COOKIE, locales, type Locale } from "./config";
import { useLocale } from "./client";

const isExternal = (href: string) => /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);

/** Prefixes an internal path with the active locale: `/cart` → `/ar/cart`. */
export function localizePath(locale: Locale, href: string): string {
  if (isExternal(href)) return href;
  const normalized = href.startsWith("/") ? href : `/${href}`;
  const [first] = normalized.split("/").filter(Boolean);
  if (isLocale(first)) return normalized; // already localized
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

/** Removes the locale prefix from a pathname: `/ar/cart` → `/cart`. */
export function stripLocale(pathname: string): string {
  const [, first, ...rest] = pathname.split("/");
  if (isLocale(first)) return `/${rest.join("/")}`.replace(/\/$/, "") || "/";
  return pathname;
}

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href"> & { href: string };

/** `next/link` that keeps the current language in the URL. */
export function Link({ href, ...props }: LinkProps) {
  const locale = useLocale();
  return <NextLink href={localizePath(locale, href)} {...props} />;
}

export function useLocalizedRouter() {
  const router = useRouter();
  const locale = useLocale();
  return useMemo(
    () => ({
      push: (href: string) => router.push(localizePath(locale, href)),
      replace: (href: string) => router.replace(localizePath(locale, href)),
      refresh: () => router.refresh(),
      back: () => router.back(),
    }),
    [router, locale],
  );
}

/** Current path without the locale segment — handy for active-link checks. */
export function useBarePathname(): string {
  return stripLocale(usePathname());
}

/** Switches language while staying on the same page, remembering the choice in a cookie. */
export function useLanguageSwitcher() {
  const router = useRouter();
  const pathname = useBarePathname();
  const current = useLocale();
  return useCallback(
    (next: Locale) => {
      if (!locales.includes(next) || next === current) return;
      document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      const search = window.location.search;
      router.push(`${localizePath(next, pathname)}${search}`);
    },
    [router, pathname, current],
  );
}
