import "server-only";
import { locale as rootLocale } from "next/root-params";
import { defaultLocale, isLocale, type Locale } from "./config";
import { ar } from "./messages/ar";
import { en } from "./messages/en";
import { createTranslator, type Messages, type Translate } from "./translate";

const catalogues: Record<Locale, Messages> = { ar, en };

export interface I18n {
  locale: Locale;
  t: Translate;
  messages: Messages;
}

export const getMessages = (locale: Locale): Messages => catalogues[locale];

/**
 * Locale + translator for Server Components, read from the `[locale]` ROOT PARAM.
 * Works inside `"use cache"` scopes and needs no prop drilling — this is what keeps pages statically cacheable.
 */
export async function getI18n(): Promise<I18n> {
  const raw = await rootLocale();
  const locale = isLocale(raw) ? raw : defaultLocale;
  return { locale, messages: catalogues[locale], t: createTranslator(catalogues[locale], locale) };
}

/** For code that already knows the locale (metadata generation, sitemaps, e-mails…). */
export function getI18nFor(locale: Locale): I18n {
  return { locale, messages: catalogues[locale], t: createTranslator(catalogues[locale], locale) };
}
