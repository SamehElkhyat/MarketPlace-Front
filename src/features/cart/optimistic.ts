import type { CartLine, CartView } from "@/lib/api/types";
import type { GuestCartItem } from "@/stores/cart.store";

/**
 * Pure cart transforms used for *optimistic* display only. The server stays the source of truth: every
 * mutation ends by replacing this estimate with the server's priced cart, so a wrong guess self-corrects.
 * Totals mirror the API (`services/cart.service.ts`): itemCount sums every line, subtotal sums purchasable lines.
 */

const isPurchasable = (line: CartLine) => line.available && line.stock > 0;

/** Recompute the aggregate fields from the lines. */
export function withTotals(items: CartLine[], hasBlockingIssues: boolean): CartView {
  return {
    items,
    itemCount: items.reduce((n, line) => n + line.qty, 0),
    subtotal: items.filter(isPurchasable).reduce((sum, line) => sum + line.lineTotal, 0),
    hasBlockingIssues,
  };
}

const withQty = (line: CartLine, qty: number): CartLine => ({
  ...line,
  qty,
  lineTotal: line.available ? line.unitPrice * qty : 0,
});

/** Set one line's quantity (<= 0 removes it). Unknown SKUs leave the cart untouched. */
export function applyQty(cart: CartView, sku: string, qty: number): CartView {
  if (!cart.items.some((line) => line.sku === sku)) return cart;
  const items = qty <= 0 ? cart.items.filter((line) => line.sku !== sku) : cart.items.map((line) => (line.sku === sku ? withQty(line, qty) : line));
  return withTotals(items, cart.hasBlockingIssues);
}

export const applyRemove = (cart: CartView, sku: string): CartView => applyQty(cart, sku, 0);

/**
 * A guest's quantities change instantly in localStorage while the priced preview is still in flight.
 * Overlay them on the last known priced cart so the drawer never shows a stale number.
 */
export function overlayGuestQuantities(cart: CartView, guestItems: GuestCartItem[]): CartView {
  const wanted = new Map(guestItems.map((item) => [item.sku, item.qty]));
  let changed = cart.items.length !== guestItems.length;
  const items: CartLine[] = [];
  for (const line of cart.items) {
    const qty = wanted.get(line.sku);
    if (qty === undefined) continue; // removed locally, preview not back yet
    if (qty !== line.qty) {
      changed = true;
      items.push(withQty(line, qty));
    } else {
      items.push(line);
    }
  }
  return changed ? withTotals(items, cart.hasBlockingIssues) : cart;
}
