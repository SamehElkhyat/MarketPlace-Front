import { intlTag, type Locale } from "@/i18n/config";
import type { Localized } from "@/lib/api/types";

/**
 * Money is stored as integer PIASTERS; everything shown to people goes through here.
 * `ar` renders Eastern Arabic numerals with the Egyptian pound sign ("١٤٩٫٩٩ ج.م.").
 */
export function formatMoney(piasters: number, locale: Locale, options: { compact?: boolean } = {}): string {
  const value = piasters / 100;
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat(intlTag(locale), {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
    ...(options.compact ? { notation: "compact" as const } : {}),
  }).format(value);
}

export const formatNumber = (value: number, locale: Locale): string =>
  new Intl.NumberFormat(intlTag(locale)).format(value);

export function formatDate(value: string | Date, locale: Locale, style: "short" | "long" | "datetime" = "long"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const options: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short" }
      : style === "datetime"
        ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
        : { day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat(intlTag(locale), options).format(date);
}

/** Picks the Arabic or English variant of a localized field, falling back to the other if empty. */
export const pick = (text: Localized | undefined, locale: Locale): string =>
  text ? text[locale] || text[locale === "ar" ? "en" : "ar"] : "";

/** Piasters → EGP string for form inputs ("149.99"). */
export const piastersToInput = (piasters: number): string => (piasters / 100).toFixed(2).replace(/\.00$/, "");

/** Form input ("149.99") → integer piasters, avoiding float drift. */
export const inputToPiasters = (value: string): number => {
  const [whole = "0", fraction = ""] = value.trim().replace(",", ".").split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
};
