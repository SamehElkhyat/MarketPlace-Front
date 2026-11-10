import { ArrowRight, Banknote, PackageCheck, RotateCcw } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { ProductCard, ProductCardSkeleton } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";
import { getBrands, getCategoryTree, getCollectionDetails } from "@/lib/data/catalog";
import { pick } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata() {
  const { locale } = await getI18n();
  return { alternates: localizedAlternates("/", locale) };
}

async function Hero() {
  const [{ t }, collection] = await Promise.all([getI18n(), getCollectionDetails("new-arrivals")]);
  const image = collection?.collection.image ?? collection?.preview[0]?.images[0]?.url;

  return (
    <section className="page-container py-12 md:py-20">
      <div className="page-grid items-center gap-y-10">
        <div className="col-span-4 md:col-span-5">
          <p className="eyebrow mb-6">{t("home.hero.eyebrow")}</p>
          <h1 className="text-2xl md:text-3xl">{t("home.hero.title")}</h1>
          <p className="mt-6 max-w-md text-muted-foreground">{t("home.hero.subtitle")}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/collections/new-arrivals">{t("home.hero.cta")}</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/collections/offers">{t("nav.offers")}</Link>
            </Button>
          </div>
        </div>
        <div className="col-span-4 md:col-span-6 md:col-start-7">
          <div className="media-4x5">
            {image ? <Image src={image} alt="" fill priority sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" /> : null}
          </div>
        </div>
      </div>
    </section>
  );
}

async function CategoryTiles() {
  const [{ t, locale }, tree] = await Promise.all([getI18n(), getCategoryTree()]);
  return (
    <section className="page-container section-y" aria-labelledby="shop-by-category">
      <div className="mb-10 flex items-end justify-between gap-4">
        <h2 id="shop-by-category" className="text-xl md:text-2xl">{t("home.categories.title")}</h2>
      </div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
        {tree.map((node) => (
          <li key={node.id}>
            <Link href={`/c/${node.slug}`} className="group block">
              <div className="media-4x5">
                {node.image ? (
                  <Image src={node.image} alt="" fill sizes="(min-width: 768px) 20vw, 50vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />
                ) : null}
              </div>
              <p className="mt-3 flex items-center justify-between text-sm">
                {pick(node.name, locale)}
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function CollectionRow({ slug, title, eyebrow }: { slug: string; title: string; eyebrow?: string }) {
  const [{ t, locale }, data] = await Promise.all([getI18n(), getCollectionDetails(slug)]);
  if (!data || data.preview.length === 0) return null;
  return (
    <section className="page-container section-y !pt-0" aria-label={title}>
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
          <h2 className="text-xl md:text-2xl">{title}</h2>
        </div>
        <Button asChild variant="link">
          <Link href={`/collections/${slug}`}>{t("home.viewAll")}</Link>
        </Button>
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-6">
        {data.preview.slice(0, 4).map((product) => (
          <li key={product.id}>
            <ProductCard product={product} locale={locale} t={t} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function BrandStrip() {
  const [{ t }, brands] = await Promise.all([getI18n(), getBrands()]);
  if (brands.length === 0) return null;
  return (
    <section className="border-y border-border" aria-label={t("nav.brands")}>
      <div className="page-container py-10">
        <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {brands.map((brand) => (
            <li key={brand._id}>
              <Link href={`/brands/${brand.slug}`} className="font-heading text-lg font-light tracking-wide text-muted-foreground transition-colors hover:text-foreground">
                {brand.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function Promises() {
  const { t } = await getI18n();
  const items = [
    { icon: Banknote, title: t("home.promise.cod.title"), body: t("home.promise.cod.body") },
    { icon: PackageCheck, title: t("home.promise.delivery.title"), body: t("home.promise.delivery.body") },
    { icon: RotateCcw, title: t("home.promise.returns.title"), body: t("home.promise.returns.body") },
  ];
  return (
    <section className="page-container section-y" aria-label={t("home.promise.label")}>
      <ul className="grid gap-10 md:grid-cols-3">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex flex-col items-start gap-3">
            <Icon className="size-6 text-accent" strokeWidth={1.25} aria-hidden />
            <h3 className="font-sans text-base font-medium tracking-normal">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RowSkeleton() {
  return (
    <div className="page-container section-y !pt-0" aria-busy>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { t } = await getI18n();
  return (
    <>
      <Suspense fallback={<div className="page-container h-[70vh]" aria-busy />}>
        <Hero />
      </Suspense>
      <Suspense fallback={null}>
        <CategoryTiles />
      </Suspense>
      <Suspense fallback={<RowSkeleton />}>
        <CollectionRow slug="new-arrivals" title={t("home.newArrivals")} eyebrow={t("home.newArrivalsEyebrow")} />
      </Suspense>
      <Suspense fallback={null}>
        <BrandStrip />
      </Suspense>
      <div className="mt-16 md:mt-24">
        <Suspense fallback={<RowSkeleton />}>
          <CollectionRow slug="best-sellers" title={t("home.bestSellers")} eyebrow={t("home.bestSellersEyebrow")} />
        </Suspense>
      </div>
      <Promises />
    </>
  );
}
