import { describe, expect, it } from "vitest";
import imageLoader from "./cloudinary-loader";
import { formatMoney, inputToPiasters, parsePriceInput, pick, piastersToInput } from "./format";
import { safeNext } from "@/features/auth/auth-views";

describe("money", () => {
  it("formats integer piasters per locale", () => {
    expect(formatMoney(14999, "en")).toMatch(/149\.99/);
    expect(formatMoney(14999, "ar")).toContain("١٤٩٫٩٩"); // Eastern Arabic numerals
    expect(formatMoney(50000, "en")).toMatch(/500(?!\.)/); // whole amounts have no decimals
  });

  it("converts between form input and piasters without float drift", () => {
    expect(inputToPiasters("149.99")).toBe(14999);
    expect(inputToPiasters("19.9")).toBe(1990);
    expect(inputToPiasters("0.07")).toBe(7);
    expect(inputToPiasters("1,5")).toBe(150);
    expect(inputToPiasters("100")).toBe(10000);
    expect(piastersToInput(14999)).toBe("149.99");
    expect(piastersToInput(10000)).toBe("100");
  });

  it("reads prices the way an Egyptian admin actually types them", () => {
    expect(parsePriceInput("٢٤٩٫٥٠")).toBe(24950); // Arabic-Indic digits + Arabic decimal mark
    expect(parsePriceInput("۱۲۰")).toBe(12000); // Persian digits
    expect(parsePriceInput("1,299.50")).toBe(129950); // grouped thousands (used to become 1.29 EGP!)
    expect(parsePriceInput("1,299")).toBe(129900);
    expect(parsePriceInput("1.299,50")).toBe(129950);
    expect(parsePriceInput(" 49 ")).toBe(4900);
    expect(parsePriceInput(".5")).toBe(50);
  });

  it("refuses anything ambiguous instead of guessing a price", () => {
    for (const bad of ["", "abc", "12.345", "1.2.3", "12 EGP", "-5", "--"]) expect(parsePriceInput(bad)).toBeNull();
    expect(inputToPiasters("abc")).toBeNaN();
  });
});

describe("pick", () => {
  it("returns the requested language and falls back when empty", () => {
    expect(pick({ ar: "قميص", en: "Shirt" }, "ar")).toBe("قميص");
    expect(pick({ ar: "", en: "Shirt" }, "ar")).toBe("Shirt");
    expect(pick(undefined, "en")).toBe("");
  });
});

describe("safeNext (open-redirect guard)", () => {
  it("only accepts same-site relative paths", () => {
    expect(safeNext("/account/orders")).toBe("/account/orders");
    expect(safeNext("//evil.com")).toBe("/account");
    expect(safeNext("https://evil.com")).toBe("/account");
    expect(safeNext("javascript:alert(1)")).toBe("/account");
    expect(safeNext(null)).toBe("/account");
  });
});

describe("image loader", () => {
  it("lets Cloudinary resize + negotiate the format", () => {
    expect(imageLoader({ src: "https://res.cloudinary.com/x/image/upload/v1/a.jpg", width: 640 })).toBe(
      "https://res.cloudinary.com/x/image/upload/f_auto,q_auto,w_640,c_limit/v1/a.jpg",
    );
  });
  it("keeps a 4:5 crop for demo photos and always honours the width contract", () => {
    expect(imageLoader({ src: "https://picsum.photos/seed/a/800/1000?grayscale", width: 400 })).toBe("https://picsum.photos/seed/a/400/500?grayscale");
    expect(imageLoader({ src: "https://example.com/p.jpg", width: 300 })).toBe("https://example.com/p.jpg?w=300");
  });
});
