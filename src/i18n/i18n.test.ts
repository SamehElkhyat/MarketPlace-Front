import { describe, expect, it } from "vitest";
import { localizePath, stripLocale } from "./navigation";
import { ar } from "./messages/ar";
import { en } from "./messages/en";
import { createTranslator, formatMessage } from "./translate";

const flatten = (obj: Record<string, unknown>, prefix = ""): string[] =>
  Object.entries(obj).flatMap(([k, val]) => (typeof val === "string" ? [prefix + k] : flatten(val as Record<string, unknown>, `${prefix}${k}.`)));

describe("catalogues", () => {
  it("Arabic and English define exactly the same keys", () => {
    expect(flatten(ar).sort()).toEqual(flatten(en).sort());
  });
});

describe("ICU-style messages", () => {
  const plural = "{count, plural, =0 {none} one {# item} other {# items}}";

  it("handles English plurals", () => {
    expect(formatMessage(plural, { count: 0 }, "en")).toBe("none");
    expect(formatMessage(plural, { count: 1 }, "en")).toBe("1 item");
    expect(formatMessage(plural, { count: 5 }, "en")).toBe("5 items");
  });

  it("handles all Arabic plural categories with Arabic numerals", () => {
    const t = createTranslator(ar, "ar");
    expect(t("cart.items", { count: 0 })).toBe("لا عناصر");
    expect(t("cart.items", { count: 1 })).toBe("عنصر واحد");
    expect(t("cart.items", { count: 2 })).toBe("عنصران");
    expect(t("cart.items", { count: 5 })).toBe("٥ عناصر"); // few
    expect(t("cart.items", { count: 11 })).toBe("١١ عنصرًا"); // many
    expect(t("cart.items", { count: 100 })).toBe("١٠٠ عنصر"); // other
  });

  it("interpolates plain variables and falls back to the key when missing", () => {
    const t = createTranslator(en, "en");
    expect(t("nav.viewAll", { name: "Fashion" })).toBe("View all Fashion");
    expect(createTranslator(en, "en")("does.not.exist" as never)).toBe("does.not.exist");
  });
});

describe("locale-aware paths", () => {
  it("prefixes internal links and leaves external ones alone", () => {
    expect(localizePath("ar", "/cart")).toBe("/ar/cart");
    expect(localizePath("en", "/")).toBe("/en");
    expect(localizePath("en", "/ar/cart")).toBe("/ar/cart");
    expect(localizePath("en", "https://example.com")).toBe("https://example.com");
    expect(localizePath("en", "#main")).toBe("#main");
  });

  it("strips the locale segment", () => {
    expect(stripLocale("/ar/account/orders")).toBe("/account/orders");
    expect(stripLocale("/en")).toBe("/");
    expect(stripLocale("/something")).toBe("/something");
  });
});
