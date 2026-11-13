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

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/**
 * Form input → integer piasters (no float drift), or `null` when it isn't a valid amount.
 * Accepts what a real admin types: Arabic-Indic digits (٢٤٩٫٥٠), "1,299.50" / "1.299,50"-style grouping,
 * a decimal comma ("1,5"), and stray spaces. Never guesses: more than two decimals or letters → `null`,
 * so a typo can't silently become a wrong price.
 */
export function parsePriceInput(value: string): number | null {
  let text = value
    .replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf)) // ٠-٩ and ۰-۹ share the low nibble with 0-9
    .replace(/[٫]/g, ".") // Arabic decimal separator
    .replace(/[٬\s ]/g, "") // Arabic thousands separator, spaces
    .trim();
  if (!text) return null;

  if (text.includes(",") && text.includes(".")) {
    // Both present: whichever comes last is the decimal mark, the other is grouping.
    const decimalIsDot = text.lastIndexOf(".") > text.lastIndexOf(",");
    text = decimalIsDot ? text.replace(/,/g, "") : text.replace(/\./g, "").replace(",", ".");
  } else if (text.includes(",")) {
    // "1,299" / "1,299,000" are grouped thousands; "1,5" / "19,90" are a decimal comma.
    text = /^\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, "") : text.replace(",", ".");
  }

  const match = /^(\d+)?(?:\.(\d{1,2}))?$/.exec(text);
  if (!match || (match[1] === undefined && match[2] === undefined)) return null;
  const piasters = Number(match[1] ?? "0") * 100 + Number(((match[2] ?? "") + "00").slice(0, 2));
  return Number.isSafeInteger(piasters) ? piasters : null;
}

/** Like {@link parsePriceInput} for payloads: an unreadable amount becomes NaN so the API rejects it loudly. */
export const inputToPiasters = (value: string): number => parsePriceInput(value) ?? Number.NaN;
