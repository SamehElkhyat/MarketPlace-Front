import { cacheLife } from "next/cache";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";
import { getCategoryTree } from "@/lib/data/catalog";
import { pick } from "@/lib/format";

/** The year is computed inside a cache scope: Cache Components forbids reading the clock while prerendering. */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export async function SiteFooter() {
  const [{ t, locale }, tree, year] = await Promise.all([getI18n(), getCategoryTree(), currentYear()]);

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="page-container section-y !py-16">
        <div className="page-grid gap-y-10">
          <div className="col-span-4 md:col-span-4">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">{t("footer.tagline")}</p>
          </div>

          <nav aria-label={t("footer.shop")} className="col-span-2 md:col-span-2 md:col-start-6">
            <h2 className="mb-4 font-sans text-xs font-medium tracking-wide text-foreground uppercase">{t("footer.shop")}</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {tree.map((node) => (
                <li key={node.id}>
                  <Link href={`/c/${node.slug}`} className="hover:text-foreground">
                    {pick(node.name, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={t("footer.discover")} className="col-span-2 md:col-span-2">
            <h2 className="mb-4 font-sans text-xs font-medium tracking-wide text-foreground uppercase">{t("footer.discover")}</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/collections/new-arrivals" className="hover:text-foreground">{t("footer.newArrivals")}</Link></li>
              <li><Link href="/collections/best-sellers" className="hover:text-foreground">{t("footer.bestSellers")}</Link></li>
              <li><Link href="/collections/offers" className="hover:text-foreground">{t("nav.offers")}</Link></li>
              <li><Link href="/brands" className="hover:text-foreground">{t("nav.brands")}</Link></li>
            </ul>
          </nav>

          <nav aria-label={t("footer.account")} className="col-span-4 md:col-span-2">
            <h2 className="mb-4 font-sans text-xs font-medium tracking-wide text-foreground uppercase">{t("footer.account")}</h2>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li><Link href="/account" className="hover:text-foreground">{t("nav.myAccount")}</Link></li>
              <li><Link href="/account/orders" className="hover:text-foreground">{t("nav.myOrders")}</Link></li>
              <li><Link href="/account/wishlist" className="hover:text-foreground">{t("nav.wishlist")}</Link></li>
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>{t("footer.rights", { year })}</p>
          <p className="flex flex-wrap items-center gap-2">
            <span>{t("footer.payments")}</span>
            <Badge variant="accent">{t("checkout.soon")}</Badge>
          </p>
        </div>
      </div>
    </footer>
  );
}
