import { describe, expect, it } from "vitest";

import { createDeliverySlots } from "./delivery-slots";

const cart = (fastDeliveryEligible: boolean) => ({
  items: [{ fastDeliveryEligible }],
}) as Parameters<typeof createDeliverySlots>[0];

describe("createDeliverySlots", () => {
  it("offers same-day Tehran windows only for an entirely fast-delivery cart", () => {
    const now = new Date("2026-07-18T04:30:00.000Z"); // Saturday, 08:00 Tehran.
    const slots = createDeliverySlots(cart(true), now);

    expect(slots).toHaveLength(9);
    expect(slots.slice(0, 3).map((slot) => slot.id)).toEqual([
      "2026-07-18-10",
      "2026-07-18-13",
      "2026-07-18-16",
    ]);
  });

  it("starts a standard cart on the next non-Friday day", () => {
    const now = new Date("2026-07-16T04:30:00.000Z"); // Thursday, 08:00 Tehran.
    const slots = createDeliverySlots(cart(false), now);

    expect(slots[0]?.id).toBe("2026-07-18-10");
    expect(slots.every((slot) => new Date(`${slot.date}T00:00:00Z`).getUTCDay() !== 5)).toBe(true);
  });

  it("removes a same-day window as soon as its start time is reached", () => {
    const now = new Date("2026-07-18T09:30:00.000Z"); // Saturday, 13:00 Tehran.
    const slots = createDeliverySlots(cart(true), now);

    expect(slots[0]?.id).toBe("2026-07-18-16");
    expect(slots).toHaveLength(9);
  });
});
