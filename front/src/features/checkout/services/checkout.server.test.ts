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
import { checkout, saveCheckoutDraft } from "./checkout.server";
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
    totals: { line_subtotal: "58000000", line_total: "58000000", currency_code: "IRR", currency_minor_unit: 0 },
    images: [],
    extensions: { kadochi: { preparationHours: 4 } },
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
    deliverySlotId: createDeliverySlots({ items: [{ preparationHours: 4 }] } as Parameters<typeof createDeliverySlots>[0]).find((slot) => slot.available)!.id,
    packagingId: "gift" as const,
    postcardEnabled: true,
    postcardDesignId: 17,
    postcardText: "Enjoy",
    operationId,
  };
}

function inputForAttempt(index: number) {
  return {
    ...input(),
    operationId: `c5012c5${index}-cd10-4ed6-b2be-9f28df81c49e`,
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

function definitiveGatewayError() {
  return new UpstreamError({
    code: "upstream_failure",
    status: 502,
    message: "gateway rejected",
    requestId: "request-1",
    retryable: false,
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

  it("creates the current checkout draft before persisting the first completed step", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 81, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({ order_id: 81, status: "checkout-draft" }, "cart-3"));

    await expect(saveCheckoutDraft({
      sender: input().sender,
      recipient: input().recipient,
      address: input().address,
    }, "request-1")).resolves.toEqual({ cartToken: "cart-3" });

    expect(transport.fetch.mock.calls.map(([path]) => path)).toEqual([
      "/wp-json/wc/store/v1/cart",
      "/wp-json/wc/store/v1/checkout",
      "/wp-json/wc/store/v1/checkout?__experimental_calc_totals=true",
    ]);
    expect(transport.fetch.mock.calls[2]?.[1]).toMatchObject({
      method: "PUT",
      headers: { "Cart-Token": "cart-2" },
    });
    expect(JSON.parse((transport.fetch.mock.calls[2]?.[1] as RequestInit).body as string)).toMatchObject({
      billing_address: { email: customer.email, phone: customer.phone },
      shipping_address: { phone: "+989121234567" },
    });
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
        "kadochi/postcard-design": "17",
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
    expect(transport.fetch.mock.calls[3]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ attemptId: operationId }),
      headers: { Authorization: "Bearer jwt", "Content-Type": "application/json" },
      timeoutMs: 25_000,
    });
  });

  it("submits five consecutive orders through one idempotent payment-start call each", async () => {
    for (let index = 0; index < 5; index += 1) {
      transport.fetch.mockReset();
      auth.getStoredAuthToken.mockResolvedValue("jwt");
      auth.wordpressBearerHeaders.mockResolvedValue({ Authorization: "Bearer jwt" });
      auth.getCurrentCustomer.mockResolvedValue(customer);
      transport.fetch
        .mockResolvedValueOnce(response(rawCart, `cart-${index}-1`))
        .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, `cart-${index}-2`))
        .mockResolvedValueOnce(response({
          order_id: 200 + index,
          status: "pending",
          payment_result: { payment_status: "pending", redirect_url: `http://localhost:8080/checkout/order-pay/${200 + index}/?key=wc_order_test` },
        }, `cart-${index}-3`))
        .mockResolvedValueOnce(new Response(null, {
          status: 302,
          headers: { Location: `https://payment.zarinpal.com/pg/StartPay/authority-${index}` },
        }));

      await expect(checkout(inputForAttempt(index), `request-${index}`)).resolves.toMatchObject({
        result: { orderId: 200 + index, paymentResult: { redirectUrl: `https://payment.zarinpal.com/pg/StartPay/authority-${index}` } },
      });
      expect(transport.fetch.mock.calls.filter(([path]) => path === `/wp-json/kadochi/v1/profile/orders/${200 + index}/retry-payment`)).toHaveLength(1);
      expect(transport.fetch.mock.calls[3]?.[1]).toMatchObject({ body: JSON.stringify({ attemptId: inputForAttempt(index).operationId }) });
    }
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

  it("routes a definite payment-start rejection to the order failure result", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({
        order_id: 96,
        status: "pending",
        payment_result: { payment_status: "pending", redirect_url: "http://localhost:8080/checkout/order-pay/96/?key=wc_order_test" },
      }, "cart-3"))
      .mockRejectedValueOnce(definitiveGatewayError())
      .mockResolvedValueOnce(response(orderSummary(96, false)));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 96, status: "pending", reconciliation: "unpaid" },
    });
    expect(transport.fetch).toHaveBeenCalledTimes(5);
  });

  it("recovers a gateway-start timeout through the same payment attempt", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({
        order_id: 95,
        status: "pending",
        payment_result: { payment_status: "pending", redirect_url: "http://localhost:8080/checkout/order-pay/95/?key=wc_order_test" },
      }, "cart-3"))
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce(response(orderSummary(95, false)))
      .mockResolvedValueOnce(new Response(null, {
        status: 302,
        headers: { Location: "https://payment.zarinpal.com/pg/StartPay/recovered-authority" },
      }));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 95, status: "pending", paymentResult: { redirectUrl: "https://payment.zarinpal.com/pg/StartPay/recovered-authority" } },
      cartToken: "cart-3",
    });
    expect(transport.fetch.mock.calls.filter(([path]) => path === "/wp-json/kadochi/v1/profile/orders/95/retry-payment")).toHaveLength(2);
    expect(transport.fetch.mock.calls[4]?.[0]).toBe(`/wp-json/kadochi/v1/checkout/operations/${operationId}`);
    expect(transport.fetch.mock.calls[5]?.[1]).toMatchObject({ body: JSON.stringify({ attemptId: operationId }) });
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
