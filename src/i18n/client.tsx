"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dirOf, type Locale } from "./config";
import { createTranslator, type Messages, type Translate } from "./translate";

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Translate;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: dirOf(locale), t: createTranslator(messages, locale) }),
    [locale, messages],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT/useLocale must be used inside <I18nProvider>");
  return ctx;
}

export const useT = (): Translate => useI18nContext().t;
export const useLocale = (): Locale => useI18nContext().locale;
export const useDir = (): "rtl" | "ltr" => useI18nContext().dir;
