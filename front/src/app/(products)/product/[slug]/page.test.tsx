import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getProductByIdentifier: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock("@/features/products/services/products.server", () => ({
  getProductByIdentifier: mocks.getProductByIdentifier,
}));

vi.mock("@/lib/server/env", () => ({
  env: { KADOCHI_FRONTEND_URL: "https://kadochi.example" },
}));

import ProductPage, { generateMetadata } from "./page";

const product = {
  id: 42,
  name: "هدیه ویژه",
  slug: "هدیه ویژه",
  description: "",
  shortDescription: "",
  price: { amount: "1000", currencyCode: "IRR", minorUnit: 0 },
  images: [],
  categories: [],
  tags: [],
  attributes: [],
  averageRating: 0,
  reviewCount: 0,
  inStock: true,
  purchasable: true,
};

describe("legacy numeric product redirects", () => {
  beforeEach(() => {
    mocks.getProductByIdentifier.mockReset();
    mocks.notFound.mockReset();
    mocks.permanentRedirect.mockReset();
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    mocks.permanentRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("resolves an existing ID and redirects to the encoded slug path", async () => {
    mocks.getProductByIdentifier.mockResolvedValue(product);

    await expect(ProductPage({ params: Promise.resolve({ slug: "42" }) })).rejects.toThrow(
      "NEXT_REDIRECT",
    );

    expect(mocks.getProductByIdentifier).toHaveBeenCalledWith("42");
    expect(mocks.permanentRedirect).toHaveBeenCalledWith(
      "/product/%D9%87%D8%AF%DB%8C%D9%87%20%D9%88%DB%8C%DA%98%D9%87",
    );
  });

  it("returns the existing not-found result for a missing numeric product", async () => {
    mocks.getProductByIdentifier.mockRejectedValue(
      Object.assign(new Error("not found"), {
        detail: {
          code: "not_found",
          status: 404,
          message: "Product not found.",
          requestId: "request-id",
          retryable: false,
        },
      }),
    );

    await expect(ProductPage({ params: Promise.resolve({ slug: "404" }) })).rejects.toThrow(
      "NEXT_NOT_FOUND",
    );
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it("renders an existing slug URL without redirecting", async () => {
    mocks.getProductByIdentifier.mockResolvedValue({ ...product, slug: "gift-box" });

    await expect(
      ProductPage({ params: Promise.resolve({ slug: "gift-box" }) }),
    ).resolves.toBeTruthy();
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it("emits a canonical URL and non-empty description for product SEO", async () => {
    mocks.getProductByIdentifier.mockResolvedValue({
      ...product,
      name: "باکس هدیه ویژه",
      slug: "metadata-gift",
      price: { amount: "850000", currencyCode: "IRR", minorUnit: 0 },
      regularPrice: { amount: "1000000", currencyCode: "IRR", minorUnit: 0 },
      images: [{ url: "https://kadochi.example/gift.jpg", alt: "باکس هدیه ویژه" }],
      attributes: [{ name: "گارانتی", value: "ضمانت اصالت کالا" }],
    });

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "metadata-gift" }),
    });

    expect(metadata.alternates?.canonical).toBe("/product/metadata-gift");
    expect(metadata.description).toContain("باکس هدیه ویژه");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph?.images).toEqual([
      { url: "https://kadochi.example/gift.jpg", alt: "باکس هدیه ویژه" },
    ]);
    expect(metadata.other).toMatchObject({
      product_id: "42",
      product_name: "باکس هدیه ویژه",
      product_price: "85000",
      product_old_price: "100000",
      availability: "instock",
      guarantee: "ضمانت اصالت کالا",
    });
  });
});
