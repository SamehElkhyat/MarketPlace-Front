"use client";

import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import { memo, useCallback } from "react";
import { toast } from "sonner";
import { Money } from "@/components/shared/price";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/features/cart/use-cart";
import { useErrorMessage } from "@/hooks/use-error-message";
import { useDir, useLocale, useT } from "@/i18n/client";
import { Link } from "@/i18n/navigation";
import type { CartLine } from "@/lib/api/types";
import { formatNumber, pick } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui.store";

export function OptionSummary({ line }: { line: Pick<CartLine, "options"> }) {
  const locale = useLocale();
  if (!line.options?.length) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {line.options.map((o) => `${pick(o.label, locale)}: ${pick(o.value, locale)}`).join(" · ")}
    </p>
  );
}

export function QuantityStepper({
  value,
  max,
  onChange,
  disabled,
  label,
}: {
  value: number;
  max: number;
  onChange: (next: number) => void;
  disabled?: boolean;
  label: string;
}) {
  const locale = useLocale();
  const t = useT();
  return (
    <div className="inline-flex items-center rounded-md border border-border" role="group" aria-label={label}>
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)} aria-label={t("cart.decrease")}>
        <Minus />
      </Button>
      <span className="min-w-8 text-center text-sm tabular-nums" aria-live="polite">
        {formatNumber(value, locale)}
      </span>
      <Button type="button" variant="ghost" size="icon-sm" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label={t("cart.increase")}>
        <Plus />
      </Button>
    </div>
  );
}

interface CartLineItemProps {
  line: CartLine;
  onQty: (vars: { sku: string; qty: number }, options: { onError: (error: unknown) => void }) => void;
  onRemove: (sku: string, options: { onError: (error: unknown) => void }) => void;
  onNavigate: () => void;
}

/**
 * One cart row. Memoized: a quantity change re-renders only the row that changed, not the whole list.
 * Props are primitives/stable references (mutate fns from TanStack Query, the unchanged `line` object).
 */
const CartLineItem = memo(function CartLineItem({ line, onQty, onRemove, onNavigate }: CartLineItemProps) {
  const t = useT();
  const locale = useLocale();
  const errorMessage = useErrorMessage();
  const title = pick(line.title, locale) || line.sku;
  const blocked = !line.available || line.stock === 0;
  const fail = (error: unknown) => toast.error(errorMessage(error));

  return (
    <li className="flex gap-3 py-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out">
      <Link href={line.slug ? `/products/${line.slug}` : "/"} onClick={onNavigate} className="media-4x5 w-20 shrink-0">
        {line.image ? <Image src={line.image} alt="" fill sizes="80px" className="object-cover" /> : null}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm">{title}</p>
          <Button variant="ghost" size="icon-xs" aria-label={t("cart.remove")} onClick={() => onRemove(line.sku, { onError: fail })}>
            <X />
          </Button>
        </div>
        <OptionSummary line={line} />

        {line.warnings.includes("UNAVAILABLE") ? <p className="text-xs text-destructive">{t("cart.warn.unavailable")}</p> : null}
        {line.warnings.includes("OUT_OF_STOCK") ? <p className="text-xs text-destructive">{t("cart.warn.outOfStock")}</p> : null}
        {line.warnings.includes("INSUFFICIENT_STOCK") ? <p className="text-xs text-warning">{t("cart.warn.limited", { count: line.stock })}</p> : null}
        {line.warnings.includes("PRICE_CHANGED") && line.previousPrice ? (
          <p className="text-xs text-warning">
            {t("cart.warn.priceWas")} <s><Money amount={line.previousPrice} /></s>
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-1">
          {/* Not disabled while a request is in flight: the value is optimistic and writes are queued in order. */}
          <QuantityStepper
            value={line.qty}
            max={Math.max(line.stock, 1)}
            disabled={blocked}
            label={t("cart.quantity")}
            onChange={(qty) => onQty({ sku: line.sku, qty }, { onError: fail })}
          />
          {line.available ? <Money amount={line.lineTotal} className="text-sm" /> : null}
        </div>
      </div>
    </li>
  );
});

/** Slide-over cart. Prices/stock come from the server; warnings (price changed, out of stock) surface per line. */
export function CartDrawer() {
  const t = useT();
  const dir = useDir();
  const open = useUiStore((s) => s.cartOpen);
  const setOpen = useUiStore((s) => s.setCartOpen);
  const { cart, isLoading, setQty, remove, itemCount, acknowledgePrices } = useCart();
  const close = useCallback(() => setOpen(false), [setOpen]);

  const hasPriceChange = cart.items.some((i) => i.warnings.includes("PRICE_CHANGED"));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* end side: right in English, left in Arabic */}
      <SheetContent side={dir === "rtl" ? "left" : "right"} className="w-full gap-0 p-0 sm:max-w-md" closeLabel={t("common.close")}>
        <SheetHeader className="border-b border-border p-4">
          <SheetTitle>{t("cart.title")}</SheetTitle>
          <SheetDescription className="sr-only">{t("cart.items", { count: itemCount })}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 p-4" aria-busy>
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="aspect-[4/5] w-20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : cart.items.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title={t("cart.empty.title")}
            description={t("cart.empty.description")}
            action={
              <Button asChild onClick={() => setOpen(false)}>
                <Link href="/collections/new-arrivals">{t("cart.empty.cta")}</Link>
              </Button>
            }
          />
        ) : (
          <>
            {hasPriceChange ? (
              <div className="flex items-center justify-between gap-3 border-b border-border bg-muted px-4 py-2 text-xs">
                <span>{t("cart.priceChanged")}</span>
                <Button variant="link" size="xs" onClick={() => void acknowledgePrices()}>
                  {t("cart.priceChangedOk")}
                </Button>
              </div>
            ) : null}

            <ul className="flex-1 divide-y divide-border overflow-y-auto px-4">
              {cart.items.map((line) => (
                <CartLineItem key={line.sku} line={line} onQty={setQty.mutate} onRemove={remove.mutate} onNavigate={close} />
              ))}
            </ul>

            <SheetFooter className="gap-3 border-t border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("cart.subtotal")}</span>
                <Money amount={cart.subtotal} className="text-lg" />
              </div>
              <p className="text-xs text-muted-foreground">{t("cart.shippingNote")}</p>
              {/* aria-disabled alone doesn't stop a link navigating — block the click and the tab stop as well. */}
              <Button asChild size="lg" className={cn("w-full", cart.hasBlockingIssues && "pointer-events-none opacity-50")}>
                <Link
                  href="/checkout"
                  aria-disabled={cart.hasBlockingIssues}
                  tabIndex={cart.hasBlockingIssues ? -1 : undefined}
                  onClick={(event) => (cart.hasBlockingIssues ? event.preventDefault() : close())}
                >
                  {t("cart.checkout")}
                </Link>
              </Button>
              {cart.hasBlockingIssues ? <p className="text-center text-xs text-destructive">{t("cart.fixIssues")}</p> : null}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
