import { parsePriceInput } from "@/lib/format";

/** The slice of a variant row the pure helpers need (the form's `VariantRow` satisfies it). */
export interface DraftVariant {
  sku: string;
  optionValues: Record<string, string>;
  price: string;
  compareAt: string;
}

/** Matches the API's SKU rule: 2–40 chars, letters/digits/-/_ and starting with a letter or digit. */
export const SKU_PATTERN = /^[A-Z0-9][A-Z0-9_-]{1,39}$/;

/** Short per-form token so generated SKUs don't collide with another product's (SKUs are globally unique). */
export const newSkuToken = (): string => Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, "0");

/**
 * A readable SKU the admin never has to type: `<TITLE>-<OPTIONS>-<TOKEN>`, e.g. `LINEN-SHIRT-M-BLACK-7K2Q`.
 * Always satisfies {@link SKU_PATTERN}.
 */
export function autoSku(titleEn: string, optionValues: Record<string, string>, token: string): string {
  const clean = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const title = clean(titleEn).slice(0, 14).replace(/-+$/, "") || "SKU";
  const options = Object.values(optionValues).map(clean).filter(Boolean).join("-");
  // Trim the readable part, never the token: the token is what keeps the SKU unique.
  const head = [title, options].filter(Boolean).join("-").slice(0, 40 - token.length - 1).replace(/-+$/, "");
  return `${head}-${token}`;
}

/** What is actually sent: the admin's own SKU when typed, otherwise the generated one. */
export const effectiveSku = (row: Pick<DraftVariant, "sku" | "optionValues">, titleEn: string, token: string): string =>
  row.sku.trim() ? row.sku.trim().toUpperCase() : autoSku(titleEn, row.optionValues, token);

export type DraftProblem =
  | { kind: "titleEn" }
  | { kind: "titleAr" }
  | { kind: "category" }
  | { kind: "sku"; variant: number }
  | { kind: "price"; variant: number }
  | { kind: "invalidPrice"; variant: number }
  | { kind: "invalidCompare"; variant: number };

interface DraftInput {
  titleEn: string;
  titleAr: string;
  categoryId: string;
  variants: DraftVariant[];
}

/** Everything that would stop the product from being saved, in the order the form shows it. */
export function findProblems(draft: DraftInput, token: string): DraftProblem[] {
  const problems: DraftProblem[] = [];
  if (!draft.titleEn.trim()) problems.push({ kind: "titleEn" });
  if (!draft.titleAr.trim()) problems.push({ kind: "titleAr" });
  if (!draft.categoryId) problems.push({ kind: "category" });

  draft.variants.forEach((row, variant) => {
    if (!SKU_PATTERN.test(effectiveSku(row, draft.titleEn, token))) problems.push({ kind: "sku", variant });
    if (!row.price.trim()) problems.push({ kind: "price", variant });
    else if (parsePriceInput(row.price) === null) problems.push({ kind: "invalidPrice", variant });
    if (row.compareAt.trim() && parsePriceInput(row.compareAt) === null) problems.push({ kind: "invalidCompare", variant });
  });
  return problems;
}
