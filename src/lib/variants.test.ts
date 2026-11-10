import { describe, expect, it } from "vitest";
import type { Variant } from "./api/types";
import { defaultSelection, findVariant, isOptionAvailable, stockStatus } from "./variants";

const v = (sku: string, size: string, color: string, stock: number): Variant => ({ _id: sku, sku, optionValues: { size, color }, price: 1000, stock });
const variants = [v("S-BLK", "S", "black", 0), v("M-BLK", "M", "black", 5), v("M-SND", "M", "sand", 2), v("L-SND", "L", "sand", 0)];
const keys = ["size", "color"];

describe("variant selection", () => {
  it("finds the exact variant, and nothing while the selection is incomplete", () => {
    expect(findVariant(variants, { size: "M", color: "sand" }, keys)?.sku).toBe("M-SND");
    expect(findVariant(variants, { size: "M" }, keys)).toBeUndefined();
    expect(findVariant(variants, { size: "XL", color: "black" }, keys)).toBeUndefined();
  });

  it("defaults to the first IN-STOCK variant", () => {
    expect(defaultSelection(variants)).toEqual({ size: "M", color: "black" });
    expect(defaultSelection([v("A", "S", "black", 0)])).toEqual({ size: "S", color: "black" }); // all sold out → first
    expect(defaultSelection([])).toEqual({});
  });

  it("greys out options that lead only to sold-out variants", () => {
    // with colour = black, size S is sold out but M is available
    expect(isOptionAvailable(variants, { color: "black" }, "size", "S")).toBe(false);
    expect(isOptionAvailable(variants, { color: "black" }, "size", "M")).toBe(true);
    // size L only exists in sand and is sold out
    expect(isOptionAvailable(variants, { color: "sand" }, "size", "L")).toBe(false);
  });

  it("classifies stock", () => {
    expect(stockStatus(undefined)).toBe("out_of_stock");
    expect(stockStatus({ stock: 0 })).toBe("out_of_stock");
    expect(stockStatus({ stock: 3 })).toBe("low_stock");
    expect(stockStatus({ stock: 40 })).toBe("in_stock");
  });
});
