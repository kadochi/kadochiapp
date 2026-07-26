import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listMagazineArticles: vi.fn(),
}));

vi.mock("@/features/magazine/services/magazine.server", () => ({
  listMagazineArticles: mocks.listMagazineArticles,
}));

import MagazinePage from "./page";

describe("magazine landing page", () => {
  it("renders its empty editorial state when WordPress is unavailable", async () => {
    mocks.listMagazineArticles.mockRejectedValueOnce(
      new Error("WordPress unavailable"),
    );

    await expect(MagazinePage()).resolves.toBeTruthy();
    expect(mocks.listMagazineArticles).toHaveBeenCalledWith({ perPage: 12 });
  });
});
