import { describe, expect, it } from "vitest";

import { checkoutDraftSchema, savedAddressSchema, submitCheckoutSchema } from "./checkout";

const validInput = {
  sender: { firstName: "A", lastName: "B" },
  recipient: { kind: "self" as const },
  address: { address1: "Tehran address" },
  deliverySlotId: "2026-07-18-10",
  packagingId: "gift" as const,
  postcardEnabled: true,
  postcardDesignId: 17,
  postcardText: "Happy birthday",
  operationId: "c5012c57-cd10-4ed6-b2be-9f28df81c49e",
};

describe("submitCheckoutSchema", () => {
  it("accepts the domain checkout payload", () => {
    expect(submitCheckoutSchema.parse(validInput)).toEqual(validInput);
  });

  it("does not let the browser choose totals, gateway, or customer identity", () => {
    expect(() => submitCheckoutSchema.parse({ ...validInput, total: "1" })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, paymentMethod: "cod" })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, email: "attacker@example.test" })).toThrow();
  });

  it("rejects malformed addresses, delivery slots, and operation IDs", () => {
    expect(() => submitCheckoutSchema.parse({ ...validInput, address: { address1: "x" } })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, address: { address1: "Tehran address", location: { latitude: 100, longitude: 51 } } })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, deliverySlotId: "tomorrow" })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, operationId: "duplicate" })).toThrow();
  });

  it("requires a valid phone number when the recipient is someone else", () => {
    const otherRecipient = { kind: "other" as const, firstName: "Recipient", lastName: "Person" };
    expect(() => submitCheckoutSchema.parse({ ...validInput, recipient: otherRecipient })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, recipient: { ...otherRecipient, phone: "not-a-phone" } })).toThrow();
    expect(submitCheckoutSchema.parse({ ...validInput, recipient: { ...otherRecipient, phone: "09121234567" } }).recipient).toMatchObject({ phone: "+989121234567" });
  });

  it("requires a design only when a postcard is enabled", () => {
    expect(() => submitCheckoutSchema.parse({ ...validInput, postcardDesignId: null })).toThrow();
    expect(submitCheckoutSchema.parse({ ...validInput, postcardEnabled: false, postcardDesignId: null, postcardText: "" }).postcardEnabled).toBe(false);
  });

  it("limits postcard messages to 200 characters", () => {
    expect(() => submitCheckoutSchema.parse({ ...validInput, postcardText: "a".repeat(201) })).toThrow();
  });
});

describe("checkoutDraftSchema", () => {
  it("accepts the empty snapshot used when checkout opens", () => {
    expect(checkoutDraftSchema.parse({})).toEqual({});
  });

  it("accepts completed step data without client-controlled payment fields", () => {
    const draft = {
      sender: validInput.sender,
      recipient: validInput.recipient,
      address: validInput.address,
      deliverySlotId: validInput.deliverySlotId,
      packagingId: validInput.packagingId,
      postcardEnabled: validInput.postcardEnabled,
      postcardDesignId: validInput.postcardDesignId,
      postcardText: validInput.postcardText,
    };
    expect(checkoutDraftSchema.parse(draft)).toEqual(draft);
    expect(() => checkoutDraftSchema.parse({ ...draft, paymentMethod: "cod" })).toThrow();
  });
});

describe("savedAddressSchema", () => {
  it("keeps existing saved addresses compatible while adding building and unit values", () => {
    expect(savedAddressSchema.parse({
      id: "c5012c57-cd10-4ed6-b2be-9f28df81c49e",
      title: "خانه",
      address1: "تهران، خیابان مثال",
      address2: "طبقه دوم",
      location: null,
    })).toMatchObject({ buildingNumber: "", unitNumber: "" });
  });
});
