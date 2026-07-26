import { describe, expect, it } from "vitest";

import { isNumericIdIdentifier, isProductIdIdentifier } from "./product-identifier";

describe("numeric entity identifiers", () => {
  it("recognizes valid legacy WooCommerce IDs", () => {
    expect(isNumericIdIdentifier("1")).toBe(true);
    expect(isNumericIdIdentifier("000123")).toBe(true);
  });

  it("leaves slugs and unsafe numeric values to slug lookup", () => {
    expect(isNumericIdIdentifier("gift-box")).toBe(false);
    expect(isNumericIdIdentifier("0")).toBe(false);
    expect(isNumericIdIdentifier("9007199254740992")).toBe(false);
  });

  it("retains the product-specific compatibility alias", () => {
    expect(isProductIdIdentifier("42")).toBe(true);
  });
});
