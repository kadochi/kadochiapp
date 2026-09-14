import { renderToStaticMarkup } from "react-dom/server";
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
    ["paid", "/checkout/success?order=72"],
    ["failed", "/checkout/failure?order=72&state=failed"],
    ["cancelled", "/checkout/failure?order=72&state=cancelled"],
  ])("routes terminal authoritative states without swallowing the redirect", async (state, destination) => {
    mocks.redirect.mockReset().mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });
    mocks.getStoredAuthToken.mockResolvedValue("jwt");
    mocks.orderSummary.mockResolvedValue({ id: 72, payment: { provider: "zarinpal", state } });

    await expect(CheckoutReturnRoute({ searchParams: Promise.resolve({ order: "72" }) }))
      .rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenLastCalledWith(destination);
  });

  it.each(["pending", "unknown"])("offers recovery actions for a %s payment", async (state) => {
    mocks.redirect.mockReset();
    mocks.getStoredAuthToken.mockResolvedValue("jwt");
    mocks.orderSummary.mockResolvedValue({ id: 72, payment: { provider: "zarinpal", state } });

    const markup = renderToStaticMarkup(await CheckoutReturnRoute({ searchParams: Promise.resolve({ order: "72" }) }));

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(markup).toContain('href="/checkout/return?order=72"');
    expect(markup).toContain('href="/profile/orders"');
  });
});
