import { beforeEach, describe, expect, it, vi } from "vitest";

const service = vi.hoisted(() => ({
  fail: false,
  products: [] as Array<{ id: number; inStock: boolean }>,
  calls: [] as Array<{ categoryId?: number; excludeId: number }>,
}));

vi.mock("../services/products.server", () => ({
  listSimilarProducts: async (input: { categoryId?: number; excludeId: number }) => {
    service.calls.push(input);
    if (service.fail) throw new Error("WordPress unavailable");
    return service.products;
  },
}));
vi.mock("@/components/layout/section-header", () => ({ default: "mock-section-header" }));
vi.mock("@/components/ui/button", () => ({ Button: "mock-button" }));
vi.mock("./products-slider", () => ({ ProductsSlider: "mock-products-slider" }));

import { SimilarProducts } from "./similar-products";

describe("SimilarProducts", () => {
  beforeEach(() => {
    service.fail = false;
    service.products = [];
    service.calls = [];
  });

  it("returns no section when the optional recommendation request fails", async () => {
    service.fail = true;

    const result = await SimilarProducts({ category: { id: 7, slug: "gifts" }, excludeId: 42 });

    expect(result).toBeNull();
  });

  it("keeps the existing section when recommendations load successfully", async () => {
    service.products = [{ id: 1, inStock: true }];

    const result = await SimilarProducts({ category: { id: 7, slug: "gifts" }, excludeId: 42 });

    expect(result).not.toBeNull();
    expect(result?.type).toBe("section");
    expect(service.calls).toEqual([{ categoryId: 7, excludeId: 42 }]);
  });
});
