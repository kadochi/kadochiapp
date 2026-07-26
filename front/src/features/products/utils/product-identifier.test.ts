import { describe, expect, it } from "vitest";

import { isProductIdIdentifier } from "./product-identifier";

describe("isProductIdIdentifier", () => {
  it("recognizes valid legacy WooCommerce IDs", () => {
    expect(isProductIdIdentifier("1")).toBe(true);
    expect(isProductIdIdentifier("000123")).toBe(true);
  });

  it("leaves slugs and unsafe numeric values to slug lookup", () => {
    expect(isProductIdIdentifier("gift-box")).toBe(false);
    expect(isProductIdIdentifier("0")).toBe(false);
    expect(isProductIdIdentifier("9007199254740992")).toBe(false);
  });
});
