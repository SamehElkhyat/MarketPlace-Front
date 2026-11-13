import { describe, expect, it } from "vitest";
import type { CartLine, CartView } from "@/lib/api/types";
import { applyQty, applyRemove, overlayGuestQuantities } from "./optimistic";

const line = (sku: string, qty: number, unitPrice: number, extra: Partial<CartLine> = {}): CartLine => ({
  sku,
  qty,
  available: true,
  unitPrice,
  stock: 10,
  lineTotal: unitPrice * qty,
  warnings: [],
  ...extra,
});

const cart = (items: CartLine[]): CartView => ({
  items,
  itemCount: items.reduce((n, i) => n + i.qty, 0),
  subtotal: items.filter((i) => i.available && i.stock > 0).reduce((s, i) => s + i.lineTotal, 0),
  hasBlockingIssues: false,
});

describe("optimistic cart transforms", () => {
  const base = cart([line("A", 1, 10_000), line("B", 2, 5_000)]);

  it("changes a quantity and recomputes line + totals without mutating the input", () => {
    const next = applyQty(base, "A", 3);
    expect(next.items[0]).toMatchObject({ qty: 3, lineTotal: 30_000 });
    expect(next.itemCount).toBe(5);
    expect(next.subtotal).toBe(40_000);
    expect(base.items[0]!.qty).toBe(1);
  });

  it("removes a line when the quantity reaches zero or on remove", () => {
    expect(applyQty(base, "A", 0).items.map((i) => i.sku)).toEqual(["B"]);
    expect(applyRemove(base, "B").subtotal).toBe(10_000);
  });

  it("ignores unknown SKUs (returns the same reference)", () => {
    expect(applyQty(base, "ZZZ", 4)).toBe(base);
  });

  it("keeps unavailable lines out of the subtotal", () => {
    const withGone = cart([line("A", 1, 10_000), line("GONE", 2, 0, { available: false, stock: 0, lineTotal: 0 })]);
    const next = applyQty(withGone, "A", 2);
    expect(next.subtotal).toBe(20_000);
    expect(next.itemCount).toBe(4);
  });

  it("overlays a guest's local quantities on the last priced cart", () => {
    const next = overlayGuestQuantities(base, [{ sku: "A", qty: 4 }]);
    expect(next.items.map((i) => [i.sku, i.qty])).toEqual([["A", 4]]);
    expect(next.subtotal).toBe(40_000);
  });

  it("returns the same reference when nothing differs (no needless re-render)", () => {
    expect(overlayGuestQuantities(base, [{ sku: "A", qty: 1 }, { sku: "B", qty: 2 }])).toBe(base);
  });
});
