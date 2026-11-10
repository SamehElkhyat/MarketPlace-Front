export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export const isLocale = (value: string | undefined | null): value is Locale =>
  !!value && (locales as readonly string[]).includes(value);

export const dirOf = (locale: Locale): "rtl" | "ltr" => (locale === "ar" ? "rtl" : "ltr");

/** BCP-47 tags used by Intl: Egyptian Arabic / English formatting with Egyptian currency. */
export const intlTag = (locale: Locale): string => (locale === "ar" ? "ar-EG" : "en-EG");

export const otherLocale = (locale: Locale): Locale => (locale === "ar" ? "en" : "ar");
