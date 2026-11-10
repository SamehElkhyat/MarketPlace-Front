import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ListingSkeleton, PageIntro } from "@/components/store/page-intro";
import { ProductListing } from "@/components/store/product-listing";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";
import { getCategoryDetails } from "@/lib/data/catalog";
import { pick } from "@/lib/format";
import { localizedAlternates } from "@/lib/seo";

export async function generateMetadata({ params }: PageProps<"/[locale]/c/[...slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { locale, t } = await getI18n();
  const details = await getCategoryDetails(slug.at(-1)!);
  if (!details) return {};
  const name = pick(details.category.name, locale);
  return {
    title: name,
    description: t("category.metaDescription", { name }),
    alternates: localizedAlternates(`/c/${slug.join("/")}`, locale),
  };
}

async function CategoryContent({ params, searchParams }: PageProps<"/[locale]/c/[...slug]">) {
  const { slug } = await params;
  const [{ locale, t }, details] = await Promise.all([getI18n(), getCategoryDetails(slug.at(-1)!)]);
  if (!details) notFound();

  const crumbs = details.breadcrumbs.map((b, index) => ({
    label: pick(b.name, locale),
    href: `/c/${details.breadcrumbs.slice(0, index + 1).map((x) => x.slug).join("/")}`,
  }));
  const here = slug.join("/");

  return (
    <>
      <PageIntro crumbs={crumbs} title={pick(details.category.name, locale)}>
        {details.children.length > 0 ? (
          <nav aria-label={t("category.subcategories")} className="mt-6 flex flex-wrap gap-2">
            {details.children.map((child) => (
              <Badge key={child.id} variant="outline" asChild className="h-9 px-4 text-sm hover:border-foreground">
                <Link href={`/c/${here}/${child.slug}`}>{pick(child.name, locale)}</Link>
              </Badge>
            ))}
          </nav>
        ) : null}
      </PageIntro>
      <div className="page-container pb-24">
        <ProductListing scope={{ category: details.category.slug }} basePath={`/c/${here}`} searchParams={searchParams} />
      </div>
    </>
  );
}

export default function CategoryPage(props: PageProps<"/[locale]/c/[...slug]">) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
