import type { Variant } from "./api/types";

export type Selection = Record<string, string>;

/** The variant whose option values exactly match the selection (or `undefined` while incomplete). */
export function findVariant(variants: readonly Variant[], selection: Selection, optionKeys: readonly string[]): Variant | undefined {
  if (optionKeys.some((key) => !selection[key])) return undefined;
  return variants.find((variant) => optionKeys.every((key) => variant.optionValues[key] === selection[key]));
}

/**
 * Whether choosing `value` for `key` (keeping the other current choices) leads to an IN-STOCK variant.
 * Used to grey out sold-out sizes/colours instead of letting the shopper discover it at checkout.
 */
export function isOptionAvailable(
  variants: readonly Variant[],
  selection: Selection,
  key: string,
  value: string,
): boolean {
  const wanted: Selection = { ...selection, [key]: value };
  return variants.some(
    (variant) =>
      variant.stock > 0 && Object.entries(wanted).every(([k, v]) => !v || variant.optionValues[k] === v),
  );
}

/** Initial selection: the first in-stock variant (falls back to the first variant). */
export function defaultSelection(variants: readonly Variant[]): Selection {
  const preferred = variants.find((v) => v.stock > 0) ?? variants[0];
  return preferred ? { ...preferred.optionValues } : {};
}

/** Lowest-friction status for the purchase UI. */
export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export const LOW_STOCK_THRESHOLD = 5;

export function stockStatus(variant: Pick<Variant, "stock"> | undefined): StockStatus {
  if (!variant || variant.stock <= 0) return "out_of_stock";
  return variant.stock <= LOW_STOCK_THRESHOLD ? "low_stock" : "in_stock";
}
