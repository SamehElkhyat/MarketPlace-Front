import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingSkeleton, PageIntro } from "@/components/store/page-intro";
import { ProductListing } from "@/components/store/product-listing";
import { getI18n } from "@/i18n/server";
import { getBrand } from "@/lib/data/catalog";
import { pick } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/brands/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale, t } = await getI18n();
  const brand = await getBrand(slug);
  if (!brand) return {};
  return {
    title: brand.name,
    description: pick(brand.description, locale) || t("brand.metaDescription", { name: brand.name }),
    alternates: localizedAlternates(`/brands/${slug}`, locale),
  };
}

async function BrandContent({ params, searchParams }: PageProps<"/[locale]/brands/[slug]">) {
  const { slug } = await params;
  const [{ locale, t }, brand] = await Promise.all([getI18n(), getBrand(slug)]);
  if (!brand) notFound();

  return (
    <>
      <PageIntro
        crumbs={[{ label: t("nav.brands"), href: "/brands" }, { label: brand.name }]}
        title={brand.name}
        description={pick(brand.description, locale)}
      />
      <div className="page-container pb-24">
        <ProductListing scope={{ brand: brand.slug }} basePath={`/brands/${brand.slug}`} searchParams={searchParams} />
      </div>
    </>
  );
}

export default function BrandPage(props: PageProps<"/[locale]/brands/[slug]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <BrandContent {...props} />
    </Suspense>
  );
}
