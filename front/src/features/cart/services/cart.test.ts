import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Cart } from "../types";

const mocks = vi.hoisted(() => ({
  bffJson: vi.fn(),
}));

vi.mock("@/lib/http/browser", () => ({
  bffJson: mocks.bffJson,
}));

const money = (amount: string) => ({ amount, currencyCode: "IRR", minorUnit: 0 });

const mutationCart = {
  items: [],
  totals: {
    totalItems: money("1200000"),
    totalItemsTax: money("0"),
    totalFees: money("0"),
    totalFeesTax: money("0"),
    totalDiscount: money("0"),
    totalDiscountTax: money("0"),
    totalShipping: money("0"),
    totalShippingTax: money("0"),
    totalTax: money("0"),
    totalPrice: money("1200000"),
  },
  shipping: { needsShipping: false, hasCalculatedShipping: false },
  paymentMethodIds: [],
  coupons: [],
  shippingRates: [],
} satisfies Cart;

function withTotal(cart: Cart, amount: string): Cart {
  return {
    ...cart,
    totals: { ...cart.totals, totalItems: money(amount), totalPrice: money(amount) },
  };
}

describe("cart browser service", () => {
  beforeEach(() => {
    mocks.bffJson.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("coalesces concurrent cart reads into one BFF request", async () => {
    let resolveRequest: ((cart: Cart) => void) | undefined;
    const request = new Promise<Cart>((resolve) => {
      resolveRequest = resolve;
    });
    mocks.bffJson.mockReturnValue(request);
    const { getCart } = await import("./cart");

    const first = getCart();
    const second = getCart();

    expect(second).toBe(first);
    expect(mocks.bffJson).toHaveBeenCalledOnce();
    expect(mocks.bffJson).toHaveBeenCalledWith("/api/cart", { method: "GET" }, expect.any(Function));

    resolveRequest?.(mutationCart);
    await expect(first).resolves.toBe(mutationCart);
    await expect(second).resolves.toBe(mutationCart);
  });

  it("reuses a mutation snapshot when the cart-changed listener refreshes", async () => {
    const windowTarget = new EventTarget();
    vi.stubGlobal("window", windowTarget);
    mocks.bffJson.mockResolvedValue(mutationCart);
    const { addItem, cartChangedEvent, getCart } = await import("./cart");
    let eventRefresh: Promise<Cart> | undefined;
    const onCartChanged = vi.fn(() => {
      eventRefresh = getCart();
    });
    windowTarget.addEventListener(cartChangedEvent, onCartChanged);

    const returned = await addItem({ productId: 42, quantity: 1 });

    expect(returned).toBe(mutationCart);
    expect(onCartChanged).toHaveBeenCalledOnce();
    await expect(eventRefresh).resolves.toBe(mutationCart);
    expect(mocks.bffJson).toHaveBeenCalledOnce();
    expect(mocks.bffJson).toHaveBeenCalledWith(
      "/api/cart/items",
      { method: "POST", body: JSON.stringify({ productId: 42, quantity: 1 }) },
      expect.any(Function),
    );
  });

  it("does not let stale reads replace a mutation snapshot or clear a newer request", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T00:00:00Z"));
    const staleCart = withTotal(mutationCart, "100000");
    const latestCart = withTotal(mutationCart, "2400000");
    let resolveOldRead: ((cart: Cart) => void) | undefined;
    let resolveMutation: ((cart: Cart) => void) | undefined;
    let resolveDuringMutationRead: ((cart: Cart) => void) | undefined;
    let resolveLatestRead: ((cart: Cart) => void) | undefined;
    mocks.bffJson
      .mockReturnValueOnce(new Promise<Cart>((resolve) => { resolveOldRead = resolve; }))
      .mockReturnValueOnce(new Promise<Cart>((resolve) => { resolveMutation = resolve; }))
      .mockReturnValueOnce(new Promise<Cart>((resolve) => { resolveDuringMutationRead = resolve; }))
      .mockReturnValueOnce(new Promise<Cart>((resolve) => { resolveLatestRead = resolve; }));
    const { addItem, getCart } = await import("./cart");

    const oldRead = getCart();
    const mutation = addItem({ productId: 42, quantity: 1 });
    const duringMutationRead = getCart();

    expect(duringMutationRead).not.toBe(oldRead);
    expect(mocks.bffJson).toHaveBeenCalledTimes(3);

    resolveMutation?.(mutationCart);
    await expect(mutation).resolves.toBe(mutationCart);
    resolveOldRead?.(staleCart);
    await expect(oldRead).resolves.toBe(staleCart);
    await expect(getCart()).resolves.toBe(mutationCart);

    await vi.advanceTimersByTimeAsync(1_001);
    const latestRead = getCart();
    expect(mocks.bffJson).toHaveBeenCalledTimes(4);

    resolveDuringMutationRead?.(staleCart);
    await expect(duringMutationRead).resolves.toBe(staleCart);
    expect(getCart()).toBe(latestRead);
    expect(mocks.bffJson).toHaveBeenCalledTimes(4);

    resolveLatestRead?.(latestCart);
    await expect(latestRead).resolves.toBe(latestCart);
    await expect(getCart()).resolves.toBe(latestCart);
  });
});
