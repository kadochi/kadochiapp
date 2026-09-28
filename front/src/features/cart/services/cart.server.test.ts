import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ fetch: vi.fn() }));
const auth = vi.hoisted(() => ({ headers: vi.fn<() => Promise<Record<string, string>>>() }));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "kadochi_cart_token" ? { value: "cart-token" } : undefined }),
}));
vi.mock("@/features/auth/services/auth.server", () => ({ wordpressBearerHeaders: auth.headers }));
vi.mock("@/lib/http/upstream", () => ({
  UpstreamError: class UpstreamError extends Error {
    constructor(public readonly detail: { status: number; retryable: boolean }) { super("Upstream failure"); }
  },
  wordpressFetch: transport.fetch,
  parseUpstreamJson: async (response: Response, parse: (value: unknown) => unknown) => parse(await response.json()),
}));

import { UpstreamError } from "@/lib/http/upstream";
import { clearCart, executeCart, removeCartCoupon } from "./cart.server";

function cartResponse(coupons: string[]) {
  return new Response(JSON.stringify({
    items: [],
    totals: {
      total_items: "0", total_items_tax: "0", total_fees: "0", total_fees_tax: "0",
      total_discount: "0", total_discount_tax: "0", total_shipping: null,
      total_shipping_tax: null, total_tax: "0", total_price: "0",
      currency_code: "IRR", currency_minor_unit: 0,
    },
    coupons: coupons.map((code) => ({ code })),
  }), { status: 200, headers: { "Cart-Token": "latest-cart-token" } });
}

const transientFailure = () => new UpstreamError({ code: "upstream_failure", status: 502, message: "Upstream failure", requestId: "request-1", retryable: true });

describe("clearCart", () => {
  beforeEach(() => {
    transport.fetch.mockReset();
    auth.headers.mockReset().mockResolvedValue({ Authorization: "Bearer customer-token" });
  });

  it("empties the current tokenized cart, including its applied coupons", async () => {
    transport.fetch.mockResolvedValue(new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Cart-Token": "cleared-cart-token" },
    }));

    await expect(clearCart("request-1")).resolves.toEqual({ cartToken: "cleared-cart-token" });
    expect(transport.fetch).toHaveBeenCalledWith("/wp-json/wc/store/v1/cart/items", {
      method: "DELETE",
      headers: { "Cart-Token": "cart-token", Authorization: "Bearer customer-token" },
      cache: "no-store",
      requestId: "request-1",
    });
  });
});

describe("executeCart", () => {
  beforeEach(() => {
    transport.fetch.mockReset().mockImplementation(async () => cartResponse([]));
    auth.headers.mockReset().mockResolvedValue({ Authorization: "Bearer customer-token" });
  });

  it("keeps Woo's customer identity on cart reads and coupon mutations", async () => {
    await executeCart({ method: "GET", path: "/wp-json/wc/store/v1/cart" }, "request-1");
    await executeCart({ method: "POST", path: "/wp-json/wc/store/v1/cart/apply-coupon", body: { code: "SAVE10" } }, "request-1");

    expect(transport.fetch.mock.calls[0][1].headers).toEqual({ "Cart-Token": "cart-token", Authorization: "Bearer customer-token" });
    expect(transport.fetch.mock.calls[1][1].headers).toEqual({ "Cart-Token": "cart-token", Authorization: "Bearer customer-token", "Content-Type": "application/json" });
  });

  it("continues to support guest carts without an auth cookie", async () => {
    auth.headers.mockResolvedValue({});

    await executeCart({ method: "GET", path: "/wp-json/wc/store/v1/cart" }, "request-1");

    expect(transport.fetch.mock.calls[0][1].headers).toEqual({ "Cart-Token": "cart-token" });
  });
});

describe("removeCartCoupon", () => {
  beforeEach(() => {
    transport.fetch.mockReset();
    auth.headers.mockReset().mockResolvedValue({ Authorization: "Bearer customer-token" });
  });

  it("accepts an already removed coupon after a failed upstream response", async () => {
    transport.fetch.mockRejectedValueOnce(transientFailure()).mockResolvedValueOnce(cartResponse([]));

    const result = await removeCartCoupon("SAVE10", "request-2");

    expect(result.cart.coupons).toEqual([]);
    expect(result.cartToken).toBe("latest-cart-token");
    expect(transport.fetch).toHaveBeenCalledTimes(2);
    expect(transport.fetch.mock.calls.map(([path]) => path)).toEqual([
      "/wp-json/wc/store/v1/cart/remove-coupon", "/wp-json/wc/store/v1/cart",
    ]);
  });

  it("retries removal once when a fresh cart still has the coupon", async () => {
    transport.fetch.mockRejectedValueOnce(transientFailure())
      .mockResolvedValueOnce(cartResponse(["save10"]))
      .mockResolvedValueOnce(cartResponse([]));

    const result = await removeCartCoupon("SAVE10", "request-3");

    expect(result.cart.coupons).toEqual([]);
    expect(transport.fetch.mock.calls.map(([path]) => path)).toEqual([
      "/wp-json/wc/store/v1/cart/remove-coupon", "/wp-json/wc/store/v1/cart",
      "/wp-json/wc/store/v1/cart/remove-coupon",
    ]);
  });

  it("checks the cart again if the retry response also fails", async () => {
    transport.fetch.mockRejectedValueOnce(transientFailure())
      .mockResolvedValueOnce(cartResponse(["save10"]))
      .mockRejectedValueOnce(transientFailure())
      .mockResolvedValueOnce(cartResponse([]));

    await expect(removeCartCoupon("save10", "request-4")).resolves.toMatchObject({ cart: { coupons: [] } });
    expect(transport.fetch).toHaveBeenCalledTimes(4);
  });

  it("does not retry a definitive coupon error", async () => {
    const failure = new UpstreamError({ code: "validation", status: 400, message: "Invalid coupon", requestId: "request-5", retryable: false });
    transport.fetch.mockRejectedValueOnce(failure);

    await expect(removeCartCoupon("SAVE10", "request-5")).rejects.toBe(failure);
    expect(transport.fetch).toHaveBeenCalledTimes(1);
  });
});
