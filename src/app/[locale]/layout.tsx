import type { Metadata, Viewport } from "next";
import { Amiri, Cormorant_Garamond, IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "../globals.css";
import { Providers } from "@/components/providers/providers";
import { dirOf, locales } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-cormorant",
  display: "swap",
});
const amiri = Amiri({ subsets: ["arabic"], weight: ["400", "700"], variable: "--font-amiri", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-plex-arabic",
  display: "swap",
});

/** Both languages are known at build time, which lets every page use Cache Components. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${SITE_NAME} — ${t("seo.tagline")}`, template: `%s · ${SITE_NAME}` },
    description: t("seo.description"),
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "ar" ? "ar_EG" : "en_US",
      title: SITE_NAME,
      description: t("seo.description"),
    },
    twitter: { card: "summary_large_image" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1eb" },
    { media: "(prefers-color-scheme: dark)", color: "#171412" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const { locale, messages } = await getI18n();

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${amiri.variable} ${inter.variable} ${plexArabic.variable}`}
    >
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
