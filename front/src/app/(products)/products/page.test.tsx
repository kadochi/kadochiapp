import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCategoryById: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  permanentRedirect: mocks.permanentRedirect,
}));

vi.mock("@/features/products/services/products.server", () => ({
  getCategoryById: mocks.getCategoryById,
  listCategories: vi.fn(),
  listProducts: vi.fn(),
  listProductTags: vi.fn(),
}));

vi.mock("@/lib/server/env", () => ({
  env: { KADOCHI_FRONTEND_URL: "https://kadochi.example" },
}));

import { redirectLegacyCategory } from "@/features/products/utils/redirect-legacy-category.server";

describe("legacy numeric category redirects", () => {
  beforeEach(() => {
    mocks.getCategoryById.mockReset();
    mocks.permanentRedirect.mockReset();
    mocks.permanentRedirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
  });

  it("resolves an existing ID and permanently redirects to its slug", async () => {
    mocks.getCategoryById.mockResolvedValue({ id: 42, slug: "flower" });

    await expect(
      redirectLegacyCategory({
        category: "00042",
        page: "2",
        tag: ["birthday", "fast-delivery"],
        utm_source: "legacy",
      }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mocks.getCategoryById).toHaveBeenCalledWith(42);
    const destination = mocks.permanentRedirect.mock.calls[0]?.[0];
    const url = new URL(destination, "https://kadochi.example");
    expect(url.pathname).toBe("/products");
    expect(url.searchParams.get("category")).toBe("flower");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.getAll("tag")).toEqual(["birthday", "fast-delivery"]);
    expect(url.searchParams.get("utm_source")).toBe("legacy");
  });

  it("does not redirect an unknown numeric category", async () => {
    mocks.getCategoryById.mockRejectedValue(
      Object.assign(new Error("not found"), {
        detail: {
          code: "not_found",
          status: 404,
          message: "Category not found.",
          requestId: "request-id",
          retryable: false,
        },
      }),
    );

    await expect(redirectLegacyCategory({ category: "404" })).resolves.toBeUndefined();
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });

  it("leaves slug category URLs untouched", async () => {
    await expect(redirectLegacyCategory({ category: "flower" })).resolves.toBeUndefined();
    expect(mocks.getCategoryById).not.toHaveBeenCalled();
    expect(mocks.permanentRedirect).not.toHaveBeenCalled();
  });
});
