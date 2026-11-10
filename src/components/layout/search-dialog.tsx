"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Price } from "@/components/shared/price";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/i18n/client";
import { Link, useLocalizedRouter } from "@/i18n/navigation";
import { api } from "@/lib/api/client";
import type { ProductCardData } from "@/lib/api/types";
import { pick } from "@/lib/format";
import { useUiStore } from "@/stores/ui.store";

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

/** Search with type-ahead suggestions (Arabic + English, tolerant of letter variants — handled server-side). */
export function SearchDialog() {
  const t = useT();
  const locale = useLocale();
  const router = useLocalizedRouter();
  const open = useUiStore((s) => s.searchOpen);
  const setOpen = useUiStore((s) => s.setSearchOpen);
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term.trim(), 200);

  const suggestions = useQuery({
    queryKey: ["suggest", debounced],
    queryFn: ({ signal }) => api<{ items: ProductCardData[] }>("/products/suggest", { query: { q: debounced }, auth: false, signal }),
    enabled: debounced.length >= 2,
    staleTime: 5 * 60_000,
  });

  const submit = () => {
    if (!term.trim()) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term.trim())}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-24 translate-y-0 gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">{t("search.title")}</DialogTitle>
        <DialogDescription className="sr-only">{t("search.description")}</DialogDescription>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="relative border-b border-border"
        >
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
          <Input
            autoFocus
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.title")}
            className="h-14 rounded-none border-0 bg-transparent ps-11 text-base focus-visible:ring-0"
          />
        </form>

        <div className="max-h-[60vh] overflow-y-auto p-2" aria-live="polite">
          {debounced.length < 2 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("search.hint")}</p>
          ) : suggestions.isPending ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : suggestions.data && suggestions.data.items.length > 0 ? (
            <ul>
              {suggestions.data.items.map((product) => (
                <li key={product.id}>
                  <Link
                    href={`/products/${product.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-sm bg-muted">
                      {product.images[0] ? <Image src={product.images[0].url} alt="" fill sizes="56px" className="object-cover" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-sm">{pick(product.title, locale)}</span>
                      <Price amount={product.minPrice} size="sm" className="text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              ))}
              <li className="border-t border-border pt-2">
                <button type="button" onClick={submit} className="w-full rounded-md p-2 text-start text-sm text-accent hover:bg-muted">
                  {t("search.seeAll", { term: debounced })}
                </button>
              </li>
            </ul>
          ) : (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("search.noResults", { term: debounced })}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
