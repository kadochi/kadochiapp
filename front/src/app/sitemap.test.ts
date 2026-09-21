import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/products/services/products.server", () => ({
  listCategories: vi.fn().mockResolvedValue([]),
  listProducts: vi.fn().mockResolvedValue({ items: [], totalPages: 0 }),
  listProductTags: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/server/env", () => ({
  env: { KADOCHI_FRONTEND_URL: "https://kadochi.example" },
}));

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("publishes the occasions page for search discovery", async () => {
    const entries = await sitemap();

    expect(entries).toContainEqual(
      expect.objectContaining({ url: "https://kadochi.example/occasions" }),
    );
  });
});
