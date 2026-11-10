import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { serializeListingParams, type ListingParams } from "@/lib/search-params";
import { getI18n } from "@/i18n/server";
import { cn } from "@/lib/utils";

interface Props {
  basePath: string;
  page: number;
  totalPages: number;
  params: ListingParams;
  label: string;
  prevLabel: string;
  nextLabel: string;
}

/** Windowed page list: 1 … 4 5 [6] 7 8 … 20 */
function pageWindow(page: number, total: number): (number | "gap")[] {
  const pages = new Set([1, total, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ["gap" as const, p] : [p]));
}

/** Plain crawlable links (no JS needed) that keep every active filter in the URL. */
export async function ListingPagination({ basePath, page, totalPages, params, label, prevLabel, nextLabel }: Props) {
  if (totalPages <= 1) return null;
  const { locale } = await getI18n();
  const href = (target: number) => serializeListingParams(basePath, { ...params, page: target > 1 ? target : null });

  return (
    <nav aria-label={label} className="mt-16 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="inline-flex h-10 items-center gap-1 px-3 text-sm hover:text-accent">
          <ChevronLeft className="size-4 rtl:rotate-180" /> {prevLabel}
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden>…</span>
        ) : (
          <Link
            key={item}
            href={href(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn("inline-flex size-10 items-center justify-center rounded-md border text-sm tabular-nums transition-colors",
              item === page ? "border-foreground bg-foreground text-background" : "border-transparent hover:border-border")}
          >
            {formatNumber(item, locale)}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className="inline-flex h-10 items-center gap-1 px-3 text-sm hover:text-accent">
          {nextLabel} <ChevronRight className="size-4 rtl:rotate-180" />
        </Link>
      ) : null}
    </nav>
  );
}
