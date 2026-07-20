import { describe, expect, it } from "vitest";

import { profileOrderDetailSchema } from "./profile";

const money = { amount: "1250000", currencyCode: "IRR", minorUnit: 0 };

describe("profileOrderDetailSchema", () => {
  it("accepts the complete order-detail response returned by the profile endpoint", () => {
    expect(profileOrderDetailSchema.parse({
      id: 42,
      status: "processing",
      createdAt: "2026-07-20T09:30:00+03:30",
      total: money,
      sender: "فرستنده تست",
      receiver: "گیرنده تست",
      deliverySlot: "2026-07-21-13",
      address: "تهران، ونک",
      items: [{ id: 7, name: "کادو", quantity: 1, imageUrl: null }],
      summary: { subtotal: money, tax: money, shipping: money, service: money, total: money },
    })).toMatchObject({ id: 42, total: money });
  });

  it("rejects malformed detail responses that omit the shared order total", () => {
    expect(() => profileOrderDetailSchema.parse({
      id: 42,
      status: "processing",
      createdAt: "2026-07-20T09:30:00+03:30",
      sender: "فرستنده تست",
      receiver: "گیرنده تست",
      deliverySlot: null,
      address: "تهران",
      items: [],
      summary: { subtotal: money, tax: money, shipping: money, service: money, total: money },
    })).toThrow();
  });
});
