"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { parseAsArrayOf, parseAsBoolean, parseAsInteger, parseAsString, useQueryStates } from "nuqs";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useLocale, useT } from "@/i18n/client";
import type { ProductListResponse } from "@/lib/api/types";
import { formatNumber, pick } from "@/lib/format";
import { SORT_OPTIONS, type SortOption } from "@/lib/search-params";
import { cn } from "@/lib/utils";

/** Empty arrays are removed from the URL entirely (null) instead of leaving a dangling key. */
const nonEmpty = <T,>(list: T[]): T[] | null => (list.length > 0 ? list : null);

const parsers = {
  brand: parseAsArrayOf(parseAsString),
  attr: parseAsArrayOf(parseAsString),
  minPrice: parseAsInteger,
  maxPrice: parseAsInteger,
  rating: parseAsInteger,
  inStock: parseAsBoolean,
  sort: parseAsString,
  page: parseAsInteger,
};

/** `shallow: false` → every change re-renders the server component, which fetches the filtered list. */
function useListingState() {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useQueryStates(parsers, { shallow: false, startTransition, clearOnDefault: true });
  const update = (patch: Partial<typeof state>) => void setState({ ...patch, page: null });
  return { state, update, setState, pending };
}

export function SortSelect() {
  const t = useT();
  const { state, update, pending } = useListingState();
  const value = (SORT_OPTIONS as readonly string[]).includes(state.sort ?? "") ? (state.sort as SortOption) : "newest";
  return (
    <div className="flex items-center gap-2" aria-busy={pending}>
      <Label htmlFor="sort" className="text-sm text-muted-foreground max-sm:sr-only">{t("listing.sortBy")}</Label>
      <Select value={value} onValueChange={(next) => update({ sort: next === "newest" ? null : next })}>
        <SelectTrigger id="sort" className="h-10 min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>{t(`listing.sort.${option}`)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-border py-5 first:pt-0">
      <legend className="mb-3 text-sm font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

function PriceFilter({ bounds }: { bounds: { min: number; max: number } }) {
  const t = useT();
  const { state, update } = useListingState();
  const [min, setMin] = useState(state.minPrice?.toString() ?? "");
  const [max, setMax] = useState(state.maxPrice?.toString() ?? "");

  const apply = () => {
    const nextMin = min === "" ? null : Math.max(0, Number(min));
    const nextMax = max === "" ? null : Math.max(0, Number(max));
    update({ minPrice: nextMin, maxPrice: nextMax });
  };

  return (
    <FilterGroup title={t("listing.price")}>
      <div className="flex items-center gap-2">
        <Input type="number" inputMode="numeric" min={0} value={min} onChange={(e) => setMin(e.target.value)} onBlur={apply}
          placeholder={String(Math.floor(bounds.min / 100))} aria-label={t("listing.minPrice")} className="h-10" />
        <span aria-hidden className="text-muted-foreground">–</span>
        <Input type="number" inputMode="numeric" min={0} value={max} onChange={(e) => setMax(e.target.value)} onBlur={apply}
          placeholder={String(Math.ceil(bounds.max / 100))} aria-label={t("listing.maxPrice")} className="h-10" />
      </div>
    </FilterGroup>
  );
}

function Swatch({ color, selected }: { color: string; selected: boolean }) {
  // The colour value comes from the category's attribute definition (data), not from component code.
  return <span aria-hidden className={cn("size-4 rounded-full border border-border", selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background")} style={{ backgroundColor: color }} />;
}

export function ListingFilters({
  facets,
  hideBrands = false,
  className,
}: {
  facets: ProductListResponse["facets"];
  hideBrands?: boolean;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const { state, update } = useListingState();

  const attrs = state.attr ?? [];
  const brands = state.brand ?? [];
  const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  const toggleAttr = (key: string, value: string) => {
    const next = toggle(attrs, `${key}:${value}`);
    update({ attr: next.length ? next : null });
  };

  return (
    <div className={className}>
      {/* keyed by the URL values so the inputs reset when filters are cleared elsewhere */}
      {facets.price && facets.price.max > facets.price.min ? <PriceFilter key={`${state.minPrice ?? ""}:${state.maxPrice ?? ""}`} bounds={facets.price} /> : null}

      {facets.attributes.map((attribute) => (
        <FilterGroup key={attribute.key} title={pick(attribute.label, locale)}>
          <ul className={cn(attribute.type === "color" ? "flex flex-wrap gap-2" : "space-y-2.5")}>
            {attribute.values.map((value) => {
              const id = `${attribute.key}:${value.value}`;
              const selected = attrs.includes(id);
              const label = value.label ? pick(value.label, locale) : value.value;
              return (
                <li key={value.value}>
                  {attribute.type === "color" && value.swatch ? (
                    <button type="button" onClick={() => toggleAttr(attribute.key, value.value)} aria-pressed={selected}
                      className="flex flex-col items-center gap-1 rounded-sm p-1 text-xs" title={`${label} (${value.count})`}>
                      <Swatch color={value.swatch} selected={selected} />
                      <span className="sr-only">{label}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <Checkbox id={id} checked={selected} onCheckedChange={() => toggleAttr(attribute.key, value.value)} />
                      <Label htmlFor={id} className="flex flex-1 cursor-pointer justify-between text-sm font-normal">
                        <span>{label}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{formatNumber(value.count, locale)}</span>
                      </Label>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </FilterGroup>
      ))}

      {!hideBrands && facets.brands.length > 0 ? (
        <FilterGroup title={t("listing.brand")}>
          <ul className="space-y-2.5">
            {facets.brands.map((brand) => (
              <li key={brand.id} className="flex items-center gap-2.5">
                <Checkbox id={`brand:${brand.slug}`} checked={brands.includes(brand.slug)}
                  onCheckedChange={() => { const next = toggle(brands, brand.slug); update({ brand: next.length ? next : null }); }} />
                <Label htmlFor={`brand:${brand.slug}`} className="flex flex-1 cursor-pointer justify-between text-sm font-normal">
                  <span>{brand.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{formatNumber(brand.count, locale)}</span>
                </Label>
              </li>
            ))}
          </ul>
        </FilterGroup>
      ) : null}

      <FilterGroup title={t("listing.rating")}>
        <Select value={state.rating?.toString() ?? "0"} onValueChange={(v) => update({ rating: v === "0" ? null : Number(v) })}>
          <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{t("listing.anyRating")}</SelectItem>
            {[4, 3, 2].map((r) => <SelectItem key={r} value={String(r)}>{t("listing.ratingAndUp", { count: r })}</SelectItem>)}
          </SelectContent>
        </Select>
      </FilterGroup>

      <FilterGroup title={t("listing.availability")}>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="in-stock" className="text-sm font-normal">{t("listing.inStockOnly")}</Label>
          <Switch id="in-stock" checked={state.inStock === true} onCheckedChange={(on) => update({ inStock: on ? true : null })} />
        </div>
      </FilterGroup>
    </div>
  );
}

/** Active filters as removable chips + "clear all". */
export function ActiveFilters({ facets }: { facets: ProductListResponse["facets"] }) {
  const t = useT();
  const locale = useLocale();
  const { state, update, setState } = useListingState();

  const chips: { id: string; label: string; remove: () => void }[] = [];
  for (const pair of state.attr ?? []) {
    const [key = "", value = ""] = pair.split(":");
    const attribute = facets.attributes.find((a) => a.key === key);
    const known = attribute?.values.find((v) => v.value === value);
    const label = `${attribute ? pick(attribute.label, locale) : key}: ${known?.label ? pick(known.label, locale) : value}`;
    chips.push({ id: pair, label, remove: () => update({ attr: nonEmpty((state.attr ?? []).filter((p) => p !== pair)) }) });
  }
  for (const slug of state.brand ?? []) {
    const name = facets.brands.find((b) => b.slug === slug)?.name ?? slug;
    chips.push({ id: `brand:${slug}`, label: name, remove: () => update({ brand: nonEmpty((state.brand ?? []).filter((s) => s !== slug)) }) });
  }
  if (state.minPrice != null || state.maxPrice != null)
    chips.push({ id: "price", label: `${t("listing.price")}: ${state.minPrice ?? 0}–${state.maxPrice ?? "∞"}`, remove: () => update({ minPrice: null, maxPrice: null }) });
  if (state.rating) chips.push({ id: "rating", label: t("listing.ratingAndUp", { count: state.rating }), remove: () => update({ rating: null }) });
  if (state.inStock) chips.push({ id: "stock", label: t("listing.inStockOnly"), remove: () => update({ inStock: null }) });

  if (chips.length === 0) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2" aria-label={t("listing.activeFilters")}>
      {chips.map((chip) => (
        <Badge key={chip.id} variant="outline" className="h-7 gap-1.5 ps-2.5 pe-1">
          {chip.label}
          <button type="button" onClick={chip.remove} aria-label={t("listing.removeFilter", { name: chip.label })} className="rounded-sm p-0.5 hover:bg-muted">
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button variant="link" size="xs" onClick={() => void setState({ attr: null, brand: null, minPrice: null, maxPrice: null, rating: null, inStock: null, page: null })}>
        {t("listing.clearAll")}
      </Button>
    </div>
  );
}

/** Bottom-sheet filters for phones (vaul drawer). */
export function MobileFilters({ facets, total, hideBrands }: { facets: ProductListResponse["facets"]; total: number; hideBrands?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="lg:hidden">
          <SlidersHorizontal /> {t("listing.filters")}
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[85dvh]">
        <DrawerHeader className="text-start">
          <DrawerTitle>{t("listing.filters")}</DrawerTitle>
          <DrawerDescription className="sr-only">{t("listing.filtersDescription")}</DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-4">
          <ListingFilters facets={facets} hideBrands={hideBrands ?? false} />
        </div>
        <DrawerFooter>
          <Button size="lg" onClick={() => setOpen(false)}>{t("listing.showResults", { count: formatNumber(total, locale) })}</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
