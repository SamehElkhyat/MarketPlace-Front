import type { Metadata } from "next";
import { Suspense } from "react";
import { ListingSkeleton, PageIntro } from "@/components/store/page-intro";
import { ProductListing } from "@/components/store/product-listing";
import { getI18n } from "@/i18n/server";
import { loadListingParams } from "@/lib/search-params";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  // Search result pages are thin content — keep them out of the index.
  return { title: t("search.title"), robots: { index: false, follow: true } };
}

async function SearchContent({ searchParams }: PageProps<"/[locale]/search">) {
  const [{ t }, params] = await Promise.all([getI18n(), loadListingParams(searchParams)]);
  const term = params.q?.trim() ?? "";
  return (
    <>
      <PageIntro
        crumbs={[{ label: t("search.title") }]}
        title={term ? t("search.resultsFor", { term }) : t("search.title")}
      />
      <div className="page-container pb-24">
        <ProductListing scope={{}} basePath="/search" searchParams={searchParams} />
      </div>
    </>
  );
}

export default function SearchPage(props: PageProps<"/[locale]/search">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <SearchContent {...props} />
    </Suspense>
  );
}
