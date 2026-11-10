"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { QuantityStepper } from "@/components/layout/cart-drawer";
import { Price } from "@/components/shared/price";
import { RatingStars } from "@/components/shared/rating-stars";
import { SizeGuide } from "@/components/store/size-guide";
import { WishlistButton } from "@/components/store/wishlist-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/use-cart";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useLocale, useT } from "@/i18n/client";
import type { AttributeDef, ProductDetailsResponse } from "@/lib/api/types";
import { formatNumber, pick } from "@/lib/format";
import { defaultSelection, findVariant, isOptionAvailable, stockStatus, type Selection } from "@/lib/variants";
import { cn } from "@/lib/utils";

interface Props {
  product: ProductDetailsResponse["product"];
  attributes: AttributeDef[];
  brandName?: string | undefined;
}

/**
 * Variant picker + add-to-cart. Option labels, swatches and allowed values come from the category's
 * attribute definitions, so a new product type needs no new UI code. A fixed bottom bar keeps the
 * primary action within thumb reach on phones.
 */
export function ProductPurchase({ product, attributes, brandName }: Props) {
  const t = useT();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const { add } = useCart();
  const title = pick(product.title, locale);

  const optionKeys = useMemo(() => product.options.map((o) => o.key), [product.options]);
  const [selection, setSelection] = useState<Selection>(() => defaultSelection(product.variants));
  // Quantity belongs to a variant: switching variant resets it to 1 (derived, no effect needed).
  const [qtyState, setQtyState] = useState({ sku: "", qty: 1 });
  const [justAdded, setJustAdded] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const variant = findVariant(product.variants, selection, optionKeys);
  const status = stockStatus(variant);
  const price = variant?.price ?? product.minPrice;

  useEffect(() => () => void (resetTimer.current && clearTimeout(resetTimer.current)), []);
  const qty = qtyState.sku === (variant?.sku ?? "") ? qtyState.qty : 1;
  const setQty = (next: number) => setQtyState({ sku: variant?.sku ?? "", qty: next });

  const addToCart = () => {
    if (!variant || status === "out_of_stock") return;
    add.mutate(
      { sku: variant.sku, qty, stock: variant.stock },
      {
        onSuccess: () => {
          setJustAdded(true); // button reads "Added" for two seconds
          resetTimer.current = setTimeout(() => setJustAdded(false), 2000);
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  };

  const label = justAdded ? t("product.added") : status === "out_of_stock" ? t("product.soldOut") : t("product.addToCart");
  const disabled = !variant || status === "out_of_stock" || add.isPending;

  const addButton = () => (
    <Button size="lg" className={cn("w-full", justAdded && "bg-success text-primary-foreground hover:bg-success")} disabled={disabled} onClick={addToCart} aria-live="polite">
      {justAdded ? <Check /> : <ShoppingBag />} {label}
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-3">
        {brandName ? <p className="eyebrow">{brandName}</p> : null}
        <h1 className="text-xl md:text-2xl">{title}</h1>
        {product.ratingCount > 0 ? (
          <RatingStars value={product.ratingAvg} count={formatNumber(product.ratingCount, locale)} size="md" label={t("product.ratingLabel", { value: product.ratingAvg })} />
        ) : null}
        <div className="flex items-center gap-3">
          <Price amount={price} compareAt={variant?.compareAtPrice} size="lg" />
          {variant?.compareAtPrice ? <Badge variant="accent">{t("product.sale")}</Badge> : null}
        </div>
      </div>

      {product.options.map((option) => {
        const definition = attributes.find((a) => a.key === option.key);
        const labelFor = (value: string) => {
          const known = definition?.values.find((v) => v.value === value);
          return known?.label ? pick(known.label, locale) : value;
        };
        const selected = selection[option.key];
        const isColor = definition?.type === "color";

        return (
          <fieldset key={option.key} className="space-y-3">
            <legend className="flex w-full items-center justify-between text-sm">
              <span>
                <span className="font-medium">{definition ? pick(definition.label, locale) : option.key}</span>
                {selected ? <span className="text-muted-foreground">: {labelFor(selected)}</span> : null}
              </span>
              {option.key === "size" ? <SizeGuide sizes={option.values} /> : null}
            </legend>
            <div className="flex flex-wrap gap-2" role="radiogroup">
              {option.values.map((value) => {
                const available = isOptionAvailable(product.variants, selection, option.key, value);
                const active = selected === value;
                const swatch = definition?.values.find((v) => v.value === value)?.swatch;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={`${labelFor(value)}${available ? "" : ` — ${t("product.soldOut")}`}`}
                    onClick={() => setSelection((s) => ({ ...s, [option.key]: value }))}
                    className={cn(
                      "relative transition-soft transition-colors outline-offset-2",
                      isColor && swatch
                        ? "size-9 rounded-full border border-border p-0.5"
                        : "h-11 min-w-12 rounded-md border px-4 text-sm",
                      active ? "border-foreground" : "border-border hover:border-muted-foreground",
                      !available && "text-muted-foreground opacity-60",
                    )}
                  >
                    {isColor && swatch ? (
                      <span className="block size-full rounded-full border border-border" style={{ backgroundColor: swatch }} />
                    ) : (
                      <span className={cn(!available && "line-through")}>{labelFor(value)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <div className="space-y-4">
        <p className={cn("text-sm", status === "out_of_stock" && "text-destructive", status === "low_stock" && "text-warning", status === "in_stock" && "text-success")} role="status">
          {status === "out_of_stock"
            ? t("product.stock.out")
            : status === "low_stock"
              ? t("product.stock.low", { count: variant?.stock ?? 0 })
              : t("product.stock.in")}
        </p>

        <div className="flex items-center gap-3">
          <QuantityStepper value={qty} max={Math.max(variant?.stock ?? 1, 1)} onChange={setQty} disabled={status === "out_of_stock"} label={t("cart.quantity")} />
          <div className="hidden flex-1 md:block">{addButton()}</div>
          <WishlistButton productId={product._id} className="border border-border" />
        </div>
      </div>

      {/* Mobile: the primary action stays fixed at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm md:hidden">
        <Price amount={price} size="md" className="shrink-0" />
        <div className="flex-1">{addButton()}</div>
      </div>
    </div>
  );
}
