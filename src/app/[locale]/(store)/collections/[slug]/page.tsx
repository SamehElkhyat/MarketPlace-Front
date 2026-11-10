import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingSkeleton, PageIntro } from "@/components/store/page-intro";
import { ProductListing } from "@/components/store/product-listing";
import { getI18n } from "@/i18n/server";
import { getCollectionDetails } from "@/lib/data/catalog";
import { pick } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/collections/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getI18n();
  const data = await getCollectionDetails(slug);
  if (!data) return {};
  return {
    title: pick(data.collection.title, locale),
    description: pick(data.collection.description, locale),
    alternates: localizedAlternates(`/collections/${slug}`, locale),
  };
}

async function CollectionContent({ params, searchParams }: PageProps<"/[locale]/collections/[slug]">) {
  const { slug } = await params;
  const [{ locale, t }, data] = await Promise.all([getI18n(), getCollectionDetails(slug)]);
  if (!data) notFound();
  const { collection } = data;

  return (
    <>
      <PageIntro
        crumbs={[{ label: t("nav.collections") }, { label: pick(collection.title, locale) }]}
        title={pick(collection.title, locale)}
        description={pick(collection.description, locale)}
      />
      {collection.image ? (
        <div className="page-container mb-12">
          <div className="relative aspect-[21/9] overflow-hidden bg-muted">
            <Image src={collection.image} alt="" fill priority sizes="(min-width: 1280px) 1216px, 100vw" className="object-cover" />
          </div>
        </div>
      ) : null}
      <div className="page-container pb-24">
        <ProductListing scope={{ collection: collection.slug }} basePath={`/collections/${collection.slug}`} searchParams={searchParams} />
      </div>
    </>
  );
}

export default function CollectionPage(props: PageProps<"/[locale]/collections/[slug]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <CollectionContent {...props} />
    </Suspense>
  );
}
