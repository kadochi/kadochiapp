import { describe, expect, it } from "vitest";

import { profileOrderDetailSchema, updatePersonalProfileSchema } from "./profile";

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
      summary: { subtotal: money, shipping: money, service: money, total: money },
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
      summary: { subtotal: money, shipping: money, service: money, total: money },
    })).toThrow();
  });
});

describe("updatePersonalProfileSchema", () => {
  const visibleSettings = {
    showAvatar: true,
    showFirstName: true,
    showLastName: true,
    showBirthDate: false,
    showWishlist: true,
  };

  it("normalizes a public-profile username before it is sent to the server", () => {
    expect(updatePersonalProfileSchema.parse({ ...visibleSettings, enabled: true, username: "AIDIN-Test" }).username).toBe("aidin-test");
  });

  it("requires a username before making a profile public", () => {
    expect(() => updatePersonalProfileSchema.parse({ ...visibleSettings, enabled: true, username: null })).toThrow();
  });
});
