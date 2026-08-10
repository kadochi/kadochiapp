import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/services/auth.server", () => ({ wordpressBearerHeaders: vi.fn() }));
vi.mock("@/lib/http/upstream", () => ({
  wordpressFetch: transport.fetch,
  parseUpstreamJson: async (response: Response, parse: (value: unknown) => unknown) => parse(await response.json()),
}));

import { listProducts, listSimilarProducts } from "./products.server";

function upstreamProduct(id: number) {
  return {
    id,
    name: `Product ${id}`,
    slug: `product-${id}`,
    description: "",
    short_description: "",
    prices: {
      price: "1000",
      regular_price: "1000",
      sale_price: "",
      currency_code: "IRR",
      currency_minor_unit: 0,
    },
    images: [],
    categories: [],
    tags: [],
    attributes: [],
    is_in_stock: true,
    is_purchasable: true,
    average_rating: "0",
    review_count: 0,
    extensions: {},
  };
}

function productResponse(ids: readonly number[], total: number, perPage: number) {
  return new Response(JSON.stringify(ids.map(upstreamProduct)), {
    headers: {
      "x-wp-total": String(total),
      "x-wp-totalpages": String(Math.ceil(total / perPage)),
    },
  });
}

function requestUrl(call: readonly unknown[]) {
  return new URL(String(call[0]), "https://wordpress.test");
}

describe("product catalog availability", () => {
  beforeEach(() => transport.fetch.mockReset());

  it("continues into the next unavailable source page without skipping products", async () => {
    transport.fetch.mockImplementation(async (path: string) => {
      const url = new URL(path, "https://wordpress.test");
      const page = Number(url.searchParams.get("page"));
      const perPage = Number(url.searchParams.get("per_page"));
      const unavailable = url.searchParams.getAll("stock_status[]").includes("outofstock");

      if (!unavailable) return productResponse([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 15, perPage);
      if (page === 1) return productResponse([101, 102, 103, 104, 105, 106, 107, 108, 109, 110], 18, perPage);
      return productResponse([111, 112, 113, 114, 115, 116, 117, 118], 18, perPage);
    });

    const result = await listProducts({ page: 3, perPage: 10 });

    expect(result.items.map((product) => product.id)).toEqual([106, 107, 108, 109, 110, 111, 112, 113, 114, 115]);
    expect(result).toMatchObject({ page: 3, perPage: 10, total: 33, totalPages: 4 });
    expect(transport.fetch).toHaveBeenCalledTimes(3);
  });

  it("requests only available products for a populated recommendation category", async () => {
    transport.fetch.mockResolvedValue(productResponse([1, 2], 2, 8));

    const products = await listSimilarProducts({ categoryId: 7, excludeId: 42 });

    expect(products.map((product) => product.id)).toEqual([1, 2]);
    expect(transport.fetch).toHaveBeenCalledTimes(1);
    const url = requestUrl(transport.fetch.mock.calls[0]);
    expect(url.searchParams.get("category")).toBe("7");
    expect(url.searchParams.get("exclude")).toBe("42");
    expect(url.searchParams.getAll("stock_status[]")).toEqual(["instock", "onbackorder"]);
  });

  it("falls back to globally popular available products without querying unavailable stock", async () => {
    transport.fetch
      .mockResolvedValueOnce(productResponse([], 0, 8))
      .mockResolvedValueOnce(productResponse([9], 1, 8));

    const products = await listSimilarProducts({ categoryId: 7, excludeId: 42 });

    expect(products.map((product) => product.id)).toEqual([9]);
    expect(transport.fetch).toHaveBeenCalledTimes(2);
    const urls = transport.fetch.mock.calls.map(requestUrl);
    expect(urls[0].searchParams.get("category")).toBe("7");
    expect(urls[1].searchParams.has("category")).toBe(false);
    expect(urls.every((url) => !url.searchParams.getAll("stock_status[]").includes("outofstock"))).toBe(true);
  });
});
