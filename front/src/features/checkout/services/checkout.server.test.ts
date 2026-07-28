import { beforeEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => ({ fetch: vi.fn() }));
const auth = vi.hoisted(() => ({
  getCurrentCustomer: vi.fn(),
  getStoredAuthToken: vi.fn(),
  wordpressBearerHeaders: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("@/lib/server/env", () => ({
  env: {
    WORDPRESS_INTERNAL_URL: "http://wordpress",
    KADOCHI_PAYMENT_METHOD_ID: "WC_ZPal",
    KADOCHI_FRONTEND_URL: "http://localhost:3000",
  },
}));
vi.mock("@/features/auth/services/auth.server", () => auth);
vi.mock("@/lib/http/upstream", () => {
  class UpstreamError extends Error {
    constructor(public readonly detail: {
      code: string;
      status: number;
      message: string;
      requestId: string;
      retryable: boolean;
    }) {
      super(detail.message);
    }
  }
  return {
    UpstreamError,
    wordpressFetch: transport.fetch,
    parseUpstreamJson: async (response: Response, parse: (value: unknown) => unknown) => parse(await response.json()),
  };
});

import { UpstreamError } from "@/lib/http/upstream";
import { checkout } from "./checkout.server";
import { createDeliverySlots } from "../utils/delivery-slots";

const operationId = "c5012c57-cd10-4ed6-b2be-9f28df81c49e";

const rawCart = {
  items: [{
    key: "line-1",
    id: 13,
    quantity: 1,
    quantity_limits: { minimum: 1, maximum: 8, multiple_of: 1, editable: true },
    name: "Gift",
    prices: { price: "58000000", currency_code: "IRR", currency_minor_unit: 0 },
    totals: { line_total: "58000000", currency_code: "IRR", currency_minor_unit: 0 },
    images: [],
    extensions: { kadochi: { fastDelivery: true } },
  }],
  totals: {
    total_items: "58000000",
    total_items_tax: "0",
    total_fees: "0",
    total_fees_tax: "0",
    total_discount: "0",
    total_discount_tax: "0",
    total_shipping: "0",
    total_shipping_tax: "0",
    total_tax: "0",
    total_price: "58000000",
    currency_code: "IRR",
    currency_minor_unit: 0,
  },
  needs_shipping: true,
  has_calculated_shipping: true,
  payment_methods: ["WC_ZPal"],
  shipping_rates: [],
};

const customer = {
  id: 7,
  email: "customer@example.test",
  displayName: "Customer",
  firstName: "Sender",
  lastName: "Name",
  phone: "+989121234567",
  roles: ["customer"],
};

function response(body: unknown, cartToken?: string, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: cartToken ? { "Cart-Token": cartToken } : undefined,
  });
}

function input() {
  return {
    sender: { firstName: "Sender", lastName: "Name" },
    recipient: { kind: "other" as const, firstName: "Recipient", lastName: "Person", phone: "+989121234567" },
    address: { address1: "Tehran delivery address", address2: "Unit 2" },
    deliverySlotId: createDeliverySlots({ items: [{ fastDeliveryEligible: true }] } as Parameters<typeof createDeliverySlots>[0])[0]!.id,
    packagingId: "gift" as const,
    postcardText: "Enjoy",
    operationId,
  };
}

function networkError() {
  return new UpstreamError({
    code: "network",
    status: 502,
    message: "network failed",
    requestId: "request-1",
    retryable: true,
  });
}

function orderSummary(id: number, paid: boolean, status = paid ? "processing" : "pending") {
  return {
    id,
    paid,
    status,
    createdAt: "2026-07-18T10:00:00+03:30",
    total: { amount: "58000000", currencyCode: "IRR", minorUnit: 0 },
    sender: "Sender Name",
    recipient: { firstName: "Recipient", lastName: "Person" },
    deliverySlot: input().deliverySlotId,
    address: "تهران، Tehran delivery address، Unit 2",
  };
}

function notFoundError() {
  return new UpstreamError({
    code: "not_found",
    status: 404,
    message: "not found",
    requestId: "request-1",
    retryable: false,
  });
}

describe("checkout service", () => {
  beforeEach(() => {
    transport.fetch.mockReset();
    auth.getStoredAuthToken.mockResolvedValue("jwt");
    auth.wordpressBearerHeaders.mockResolvedValue({ Authorization: "Bearer jwt" });
    auth.getCurrentCustomer.mockResolvedValue(customer);
  });

  it("submits server-owned identity and rotates the cart token through payment", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({
        order_id: 90,
        status: "pending",
        payment_result: { payment_status: "pending", redirect_url: "https://payment.zarinpal.com/pg/StartPay/authority" },
      }, "cart-3"));

    const completed = await checkout(input(), "request-1");

    expect(completed).toMatchObject({
      cartToken: "cart-3",
      result: { orderId: 90, status: "pending", paymentResult: { redirectUrl: "https://payment.zarinpal.com/pg/StartPay/authority" } },
    });
    const [postPath, postOptions] = transport.fetch.mock.calls[2] as [string, RequestInit];
    expect(postPath).toBe("/wp-json/wc/store/v1/checkout");
    expect(postOptions.headers).toMatchObject({ "Cart-Token": "cart-2", "Idempotency-Key": operationId });
    expect(JSON.parse(postOptions.body as string)).toMatchObject({
      billing_address: { first_name: "Sender", email: customer.email, phone: customer.phone, country: "IR", city: "تهران" },
      shipping_address: { first_name: "Recipient", last_name: "Person", phone: "+989121234567", country: "IR", city: "تهران" },
      payment_method: "WC_ZPal",
      additional_fields: {
        "kadochi/delivery-slot": input().deliverySlotId,
        "kadochi/packaging": "gift",
        "kadochi/postcard": "Enjoy",
        "kadochi/location": "",
        "kadochi/operation-id": operationId,
      },
    });
    expect(transport.fetch).toHaveBeenCalledTimes(3);
  });

  it("starts the gateway when Woo returns its intermediate order-pay page", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({
        order_id: 93,
        status: "pending",
        payment_result: {
          payment_status: "pending",
          redirect_url: "http://localhost:8080/checkout/order-pay/93/?key=wc_order_test",
        },
      }, "cart-3"))
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: "https://payment.zarinpal.com/pg/StartPay/authority" },
      }));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 93, paymentResult: { paymentStatus: "pending", redirectUrl: "https://payment.zarinpal.com/pg/StartPay/authority" } },
    });
    expect(transport.fetch.mock.calls[3]?.[0]).toBe("/wp-json/kadochi/v1/profile/orders/93/retry-payment");
    expect(transport.fetch.mock.calls[3]?.[1]).toMatchObject({ method: "POST", headers: { Authorization: "Bearer jwt" } });
  });

  it("leaves a pre-payment transport failure retryable", async () => {
    transport.fetch.mockRejectedValueOnce(networkError());

    await expect(checkout(input(), "request-1")).rejects.toMatchObject({ detail: { code: "network" } });
    expect(transport.fetch).toHaveBeenCalledTimes(1);
  });

  it("reconciles an ambiguous failure after the payment request starts", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(response(orderSummary(91, true)));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 91, status: "processing", reconciliation: "paid" },
      cartToken: "cart-2",
    });
    expect(transport.fetch.mock.calls[3]?.[0]).toBe(`/wp-json/kadochi/v1/checkout/operations/${operationId}`);
  });

  it("reconciles a gateway-start timeout without issuing a second authority request", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({
        order_id: 95,
        status: "pending",
        payment_result: { payment_status: "pending", redirect_url: "http://localhost:8080/checkout/order-pay/95/?key=wc_order_test" },
      }, "cart-3"))
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(response(orderSummary(95, false)));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 95, status: "pending", reconciliation: "unpaid" },
      cartToken: "cart-3",
    });
    expect(transport.fetch.mock.calls.filter(([path]) => path === "/wp-json/kadochi/v1/profile/orders/95/retry-payment")).toHaveLength(1);
    expect(transport.fetch.mock.calls[4]?.[0]).toBe(`/wp-json/kadochi/v1/checkout/operations/${operationId}`);
  });

  it("starts the gateway when Woo returns HTTP 400 after materializing an unpaid order", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({
        order_id: 92,
        status: "failed",
        payment_result: { payment_status: "failure", redirect_url: "" },
      }, "cart-3", 400))
      .mockResolvedValueOnce(response(orderSummary(92, false)))
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: "https://payment.zarinpal.com/pg/StartPay/authority" },
      }));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 92, status: "pending", paymentResult: { paymentStatus: "pending", redirectUrl: "https://payment.zarinpal.com/pg/StartPay/authority" } },
      cartToken: "cart-3",
    });
    expect((transport.fetch.mock.calls[2]?.[1] as { acceptStatuses?: number[] }).acceptStatuses).toEqual([400]);
    expect(transport.fetch.mock.calls[3]?.[0]).toBe(`/wp-json/kadochi/v1/checkout/operations/${operationId}`);
    expect(transport.fetch.mock.calls[4]?.[0]).toBe("/wp-json/kadochi/v1/profile/orders/92/retry-payment");
  });

  it("returns paid reconciliation for an HTTP 400 materialized order without starting another payment", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({ code: "gateway_failure" }, "cart-3", 400))
      .mockResolvedValueOnce(response(orderSummary(94, true)));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 94, status: "processing", reconciliation: "paid" },
      cartToken: "cart-3",
    });
    expect(transport.fetch).toHaveBeenCalledTimes(4);
  });

  it("keeps an HTTP 400 without a materialized order as a safe checkout error", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({ code: "invalid_address", message: "unsafe upstream detail" }, "cart-3", 400))
      .mockRejectedValueOnce(notFoundError());

    await expect(checkout(input(), "request-1")).rejects.toMatchObject({
      detail: { code: "validation", status: 400, message: "The checkout could not be completed." },
    });
    expect(transport.fetch).toHaveBeenCalledTimes(4);
  });
});
