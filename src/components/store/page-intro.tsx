import { Fragment, type ReactNode } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Link } from "@/i18n/navigation";
import { getI18n } from "@/i18n/server";

export interface Crumb {
  label: string;
  href?: string;
}

/** Accessible breadcrumb trail; the last crumb is the current page. */
export async function Breadcrumbs({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  const { t } = await getI18n();
  const all: Crumb[] = [{ label: t("nav.home"), href: "/" }, ...crumbs];
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {all.map((crumb, index) => {
          const last = index === all.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {last || !crumb.href ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {/* The separator is itself an <li>, so it must be a SIBLING of the item, never a child. */}
              {!last ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** Breadcrumbs + serif H1 + optional intro — the quiet header every listing page shares. */
export async function PageIntro({
  crumbs,
  title,
  description,
  children,
}: {
  crumbs: Crumb[];
  title: string;
  description?: string | undefined;
  children?: ReactNode;
}) {
  return (
    <header className="page-container pt-8 pb-10 md:pt-12 md:pb-14">
      <Breadcrumbs crumbs={crumbs} className="mb-6" />
      <h1 className="text-xl md:text-2xl">{title}</h1>
      {description ? <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p> : null}
      {children}
    </header>
  );
}

export function ListingSkeleton() {
  return (
    <div className="page-container pb-24" aria-busy>
      <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="space-y-3">
            <div className="media-4x5 animate-pulse" />
            <div className="h-4 w-3/4 animate-pulse rounded-sm bg-muted" />
            <div className="h-4 w-1/3 animate-pulse rounded-sm bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
