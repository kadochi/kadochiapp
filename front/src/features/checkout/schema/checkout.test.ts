import { describe, expect, it } from "vitest";

import { submitCheckoutSchema } from "./checkout";

const validInput = {
  sender: { firstName: "A", lastName: "B" },
  recipient: { kind: "self" as const },
  address: { address1: "Tehran address", postcode: "1234567890" },
  deliverySlotId: "2026-07-18-10",
  packagingId: "gift" as const,
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
    expect(() => submitCheckoutSchema.parse({ ...validInput, address: { address1: "Tehran address" } })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, deliverySlotId: "tomorrow" })).toThrow();
    expect(() => submitCheckoutSchema.parse({ ...validInput, operationId: "duplicate" })).toThrow();
  });
});
