import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isPendingPaymentOrder: vi.fn(),
  orderSummary: vi.fn(),
  clearCart: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/checkout/services/paid-cart.server", async () => ({
  ...(await vi.importActual<object>("@/features/checkout/services/paid-cart.server")),
  isPendingPaymentOrder: mocks.isPendingPaymentOrder,
}));
vi.mock("@/features/checkout/services/checkout.server", () => ({ orderSummary: mocks.orderSummary }));
vi.mock("@/features/cart/services/cart.server", () => ({ clearCart: mocks.clearCart, applyCartToken: vi.fn() }));
vi.mock("@/lib/http/route", async () => ({
  ...(await vi.importActual<object>("@/lib/http/route")),
  assertSameOrigin: vi.fn(),
  requestId: () => "request-1",
}));

import { POST } from "./route";

const call = (orderId = "72") => POST(new Request(`https://shop.test/api/checkout/orders/${orderId}/paid-cart`, { method: "POST" }), { params: Promise.resolve({ orderId }) });

describe("POST /api/checkout/orders/[orderId]/paid-cart", () => {
  beforeEach(() => {
    mocks.isPendingPaymentOrder.mockReset().mockResolvedValue(true);
    mocks.orderSummary.mockReset().mockResolvedValue({ id: 72, payment: { provider: "zarinpal", state: "paid" } });
    mocks.clearCart.mockReset().mockResolvedValue({ cartToken: null });
  });

  it("clears the cart once and expires the payment marker", async () => {
    const response = await call();

    expect(await response.json()).toEqual({ cleared: true });
    expect(mocks.clearCart).toHaveBeenCalledOnce();
    expect(response.headers.get("set-cookie")).toMatch(/kadochi_payment_order=;.*Max-Age=0/i);
  });

  it("leaves the cart alone for an order this browser did not just pay", async () => {
    mocks.isPendingPaymentOrder.mockResolvedValue(false);

    expect(await (await call()).json()).toEqual({ cleared: false });
    expect(mocks.orderSummary).not.toHaveBeenCalled();
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });

  it("leaves the cart alone while the order is not paid", async () => {
    mocks.orderSummary.mockResolvedValue({ id: 72, payment: { provider: "zarinpal", state: "pending" } });

    expect(await (await call()).json()).toEqual({ cleared: false });
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });
});
