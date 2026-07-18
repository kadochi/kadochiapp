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
    KADOCHI_CHECKOUT_ENABLED: "true",
    KADOCHI_PAYMENT_METHOD_ID: "zarinpal",
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
  payment_methods: ["zarinpal"],
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
    recipient: { kind: "other" as const, firstName: "Recipient", lastName: "Person" },
    address: { address1: "Tehran delivery address", address2: "Unit 2", postcode: "1234567890" },
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
        payment_result: { payment_status: "pending", redirect_url: "https://pay.example/session" },
      }, "cart-3"));

    const completed = await checkout(input(), "request-1");

    expect(completed).toMatchObject({
      cartToken: "cart-3",
      result: { orderId: 90, status: "pending", paymentResult: { redirectUrl: "https://pay.example/session" } },
    });
    const [postPath, postOptions] = transport.fetch.mock.calls[2] as [string, RequestInit];
    expect(postPath).toBe("/wp-json/wc/store/v1/checkout");
    expect(postOptions.headers).toMatchObject({ "Cart-Token": "cart-2", "Idempotency-Key": operationId });
    expect(JSON.parse(postOptions.body as string)).toMatchObject({
      billing_address: { first_name: "Sender", email: customer.email, phone: customer.phone, country: "IR", city: "تهران" },
      shipping_address: { first_name: "Recipient", last_name: "Person", country: "IR", city: "تهران" },
      payment_method: "zarinpal",
      additional_fields: {
        "kadochi/delivery-slot": input().deliverySlotId,
        "kadochi/packaging": "gift",
        "kadochi/postcard": "Enjoy",
        "kadochi/operation-id": operationId,
      },
    });
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
      .mockResolvedValueOnce(response({
        id: 91,
        paid: true,
        status: "processing",
        createdAt: "2026-07-18T10:00:00+03:30",
        total: { amount: "58000000", currencyCode: "IRR", minorUnit: 0 },
        recipient: { firstName: "Recipient", lastName: "Person" },
        deliverySlot: input().deliverySlotId,
      }));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 91, status: "processing", reconciliation: "paid" },
      cartToken: "cart-2",
    });
    expect(transport.fetch.mock.calls[3]?.[0]).toBe(`/wp-json/kadochi/v1/checkout/operations/${operationId}`);
  });

  it("preserves Woo's structured HTTP 400 gateway-failure result", async () => {
    transport.fetch
      .mockResolvedValueOnce(response(rawCart, "cart-1"))
      .mockResolvedValueOnce(response({ order_id: 0, status: "checkout-draft" }, "cart-2"))
      .mockResolvedValueOnce(response({
        order_id: 92,
        status: "failed",
        payment_result: { payment_status: "failure", redirect_url: "" },
      }, "cart-3", 400));

    await expect(checkout(input(), "request-1")).resolves.toMatchObject({
      result: { orderId: 92, status: "failed", paymentResult: { paymentStatus: "failure" } },
      cartToken: "cart-3",
    });
    expect((transport.fetch.mock.calls[2]?.[1] as { acceptStatuses?: number[] }).acceptStatuses).toEqual([400]);
  });
});
