import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  getStoredAuthToken: vi.fn(),
  orderSummary: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/features/auth/services/auth.server", () => ({ getStoredAuthToken: mocks.getStoredAuthToken }));
vi.mock("@/features/checkout/services/checkout.server", () => ({ orderSummary: mocks.orderSummary }));
vi.mock("@/components/layout/header", () => ({ Header: () => null }));

import CheckoutReturnRoute from "./page";

describe("CheckoutReturnRoute", () => {
  it.each([
    [true, "/checkout/success?order=72"],
    [false, "/checkout/failure?order=72"],
  ])("branches a verified gateway return without swallowing the redirect", async (paid, destination) => {
    mocks.redirect.mockReset().mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getStoredAuthToken.mockResolvedValue("jwt");
    mocks.orderSummary.mockResolvedValue({ id: 72, paid });

    await expect(CheckoutReturnRoute({ searchParams: Promise.resolve({ order: "72" }) }))
      .rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenLastCalledWith(destination);
  });
});
