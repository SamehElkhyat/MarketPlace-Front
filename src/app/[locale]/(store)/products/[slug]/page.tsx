import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/store/page-intro";
import { ProductCard } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchase } from "@/components/store/product-purchase";
import { ReviewsSection } from "@/components/store/reviews-section";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { getI18n } from "@/i18n/server";
import { getProduct } from "@/lib/data/catalog";
import { pick } from "@/lib/format";
import { jsonLd, localizedAlternates } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n();
  const data = await getProduct(slug);
  if (!data) return {};
  const title = pick(data.product.title, locale);
  const description = pick(data.product.description, locale).slice(0, 160);
  const image = data.product.images[0]?.url;
  return {
    title,
    description,
    alternates: localizedAlternates(`/products/${slug}`, locale),
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE_URL}/${locale}/products/${slug}`,
      ...(image ? { images: [{ url: image, width: 800, height: 1000, alt: title }] } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: [image] } : {}) },
  };
}

function ProductSkeleton() {
  return (
    <div className="page-container grid gap-10 py-10 md:grid-cols-2" aria-busy>
      <div className="media-4x5 animate-pulse" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/[locale]/products/[slug]">, "params">) {
  const { slug } = await params;
  const [{ t, locale }, data] = await Promise.all([getI18n(), getProduct(slug)]);
  if (!data) notFound();

  const { product, brand, breadcrumbs, attributes, related } = data;
  const title = pick(product.title, locale);
  const description = pick(product.description, locale);
  const inStock = product.variants.some((v) => v.stock > 0);

  const specs = Object.entries(product.specs).map(([key, value]) => ({ key, value }));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    description,
    image: product.images.map((i) => i.url),
    sku: product.variants[0]?.sku,
    ...(brand ? { brand: { "@type": "Brand", name: brand.name } } : {}),
    ...(product.ratingCount > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount } }
      : {}),
    offers: {
      "@type": product.minPrice === product.maxPrice ? "Offer" : "AggregateOffer",
      priceCurrency: "EGP",
      ...(product.minPrice === product.maxPrice
        ? { price: (product.minPrice / 100).toFixed(2) }
        : { lowPrice: (product.minPrice / 100).toFixed(2), highPrice: (product.maxPrice / 100).toFixed(2), offerCount: product.variants.length }),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${SITE_URL}/${locale}/products/${slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <div className="page-container pt-8 pb-28 md:pb-24">
        <Breadcrumbs
          className="mb-8"
          crumbs={[
          ...breadcrumbs.map((b, index) => ({
            label: pick(b.name, locale),
            href: `/c/${breadcrumbs.slice(0, index + 1).map((x) => x.slug).join("/")}`,
          })),
          { label: title },
          ]}
        />

        <div className="page-grid gap-y-10">
          <div className="col-span-4 md:col-span-7">
            <ProductGallery images={product.images} title={title} />
          </div>
          <div className="col-span-4 md:col-span-5">
            <div className="md:sticky md:top-24">
              <ProductPurchase product={product} attributes={attributes} brandName={brand?.name} />

              <Accordion type="single" collapsible defaultValue="description" className="mt-8 border-t border-border">
                <AccordionItem value="description">
                  <AccordionTrigger>{t("product.description")}</AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-muted-foreground">{description || t("product.noDescription")}</AccordionContent>
                </AccordionItem>
                {specs.length > 0 ? (
                  <AccordionItem value="details">
                    <AccordionTrigger>{t("product.details")}</AccordionTrigger>
                    <AccordionContent>
                      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                        {specs.map(({ key, value }) => {
                          const def = attributes.find((a) => a.key === key);
                          return (
                            <div key={key} className="contents">
                              <dt className="text-muted-foreground">{def ? pick(def.label, locale) : key.replace(/_/g, " ")}</dt>
                              <dd>{value}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    </AccordionContent>
                  </AccordionItem>
                ) : null}
                <AccordionItem value="shipping">
                  <AccordionTrigger>{t("product.shipping")}</AccordionTrigger>
                  <AccordionContent className="leading-relaxed text-muted-foreground">{t("product.shippingBody")}</AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>

        <div className="section-y !pb-0">
          <ReviewsSection productId={product._id} ratingAvg={product.ratingAvg} ratingCount={product.ratingCount} />
        </div>

        {related.length > 0 ? (
          <section className="section-y !pb-0" aria-labelledby="related-heading">
            <h2 id="related-heading" className="mb-8 text-xl">{t("product.related")}</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
              {related.slice(0, 4).map((item) => (
                <li key={item.id}>
                  <ProductCard product={item} locale={locale} t={t} sizes="(min-width: 768px) 22vw, 50vw" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}

export default function ProductPage(props: PageProps<"/[locale]/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={props.params} />
    </Suspense>
  );
}
