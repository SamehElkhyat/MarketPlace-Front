import type { Metadata } from "next";
import { PageIntro } from "@/components/store/page-intro";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";
import { getBrands } from "@/lib/data/catalog";
import { pick } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getI18n();
  return { title: t("nav.brands"), alternates: localizedAlternates("/brands", locale) };
}

export default async function BrandsPage() {
  const [{ t, locale }, brands] = await Promise.all([getI18n(), getBrands()]);
  return (
    <>
      <PageIntro crumbs={[{ label: t("nav.brands") }]} title={t("nav.brands")} description={t("brand.intro")} />
      <div className="page-container pb-24">
        <ul className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <li key={brand._id} className="bg-background">
              <Link href={`/brands/${brand.slug}`} className="group flex h-full flex-col gap-3 p-8 transition-colors hover:bg-card">
                <span className="font-heading text-xl font-light">{brand.name}</span>
                <span className="line-clamp-2 text-sm text-muted-foreground">{pick(brand.description, locale)}</span>
                <span className="mt-auto pt-4 text-xs tracking-wide text-accent">{t("brand.shop")} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
