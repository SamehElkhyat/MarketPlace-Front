import { describe, expect, it } from "vitest";
import { SKU_PATTERN, autoSku, effectiveSku, findProblems } from "./product-draft";

const row = (over: Partial<{ sku: string; price: string; compareAt: string; optionValues: Record<string, string> }> = {}) => ({
  sku: "",
  optionValues: {},
  price: "249.50",
  compareAt: "",
  ...over,
});
const ok = { titleEn: "Linen Shirt", titleAr: "قميص كتان", categoryId: "abc" };

describe("autoSku", () => {
  it("builds a readable, API-valid SKU from the title and options", () => {
    const sku = autoSku("Linen Shirt", { size: "M", color: "black" }, "7K2Q");
    expect(sku).toBe("LINEN-SHIRT-M-BLACK-7K2Q");
    expect(sku).toMatch(SKU_PATTERN);
  });

  it("falls back to SKU when the title has no latin characters, and never exceeds 40 chars", () => {
    expect(autoSku("قميص", {}, "AB12")).toBe("SKU-AB12");
    const long = autoSku("A very long product title indeed", { a: "extra-long-option-value-number-one", b: "another-long-value" }, "ZZZZ");
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long).toMatch(SKU_PATTERN);
  });
});

describe("effectiveSku", () => {
  it("keeps the admin's own SKU (upper-cased) and only generates when it's blank", () => {
    expect(effectiveSku(row({ sku: " tee-m " }), "Tee", "AAAA")).toBe("TEE-M");
    expect(effectiveSku(row(), "Tee", "AAAA")).toBe("TEE-AAAA");
  });
});

describe("findProblems", () => {
  it("accepts a complete draft even though the SKU was left blank (it is generated)", () => {
    expect(findProblems({ ...ok, variants: [row()] }, "AAAA")).toEqual([]);
  });

  it("lists every missing piece, in form order", () => {
    const problems = findProblems({ titleEn: " ", titleAr: "", categoryId: "", variants: [row({ price: "" })] }, "AAAA");
    expect(problems.map((p) => p.kind)).toEqual(["titleEn", "titleAr", "category", "price"]);
  });

  it("flags unreadable prices per variant, and accepts Arabic digits", () => {
    const problems = findProblems({ ...ok, variants: [row({ price: "٢٥٠" }), row({ price: "12 EGP" }), row({ compareAt: "x" })] }, "AAAA");
    expect(problems).toEqual([
      { kind: "invalidPrice", variant: 1 },
      { kind: "invalidCompare", variant: 2 },
    ]);
  });

  it("rejects a hand-typed SKU the API would refuse", () => {
    expect(findProblems({ ...ok, variants: [row({ sku: "a b" })] }, "AAAA")).toEqual([{ kind: "sku", variant: 0 }]);
  });
});
