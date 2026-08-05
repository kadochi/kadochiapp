import { describe, expect, it } from "vitest";

import { createDeliverySlots } from "./delivery-slots";

const cart = (preparationHours: number) => ({
  items: [{ preparationHours }],
}) as Parameters<typeof createDeliverySlots>[0];

describe("createDeliverySlots", () => {
  it("only enables same-day windows that leave enough preparation time", () => {
    const now = new Date("2026-07-18T04:30:00.000Z"); // Saturday, 08:00 Tehran.
    const slots = createDeliverySlots(cart(4), now);

    expect(slots.slice(0, 3).map((slot) => [slot.id, slot.available])).toEqual([
      ["2026-07-18-10", false],
      ["2026-07-18-13", true],
      ["2026-07-18-16", true],
    ]);
  });

  it("disables every following-day window when 24 hours are needed after a 9 PM order", () => {
    const now = new Date("2026-07-18T17:30:00.000Z"); // Saturday, 21:00 Tehran.
    const slots = createDeliverySlots(cart(24), now);

    expect(slots.slice(0, 3).map((slot) => [slot.id, slot.available])).toEqual([
      ["2026-07-19-10", false],
      ["2026-07-19-13", false],
      ["2026-07-19-16", false],
    ]);
    expect(slots.find((slot) => slot.available)?.id).toBe("2026-07-20-10");
  });

  it("uses the longest preparation time in a mixed cart", () => {
    const now = new Date("2026-07-18T04:30:00.000Z"); // Saturday, 08:00 Tehran.
    const slots = createDeliverySlots({ items: [{ preparationHours: 4 }, { preparationHours: 30 }] } as Parameters<typeof createDeliverySlots>[0], now);

    expect(slots.find((slot) => slot.available)?.id).toBe("2026-07-19-16");
  });

  it("skips Fridays while preserving disabled future windows", () => {
    const now = new Date("2026-07-16T04:30:00.000Z"); // Thursday, 08:00 Tehran.
    const slots = createDeliverySlots(cart(24), now);

    expect(slots[0]?.id).toBe("2026-07-16-10");
    expect(slots.find((slot) => slot.available)?.id).toBe("2026-07-18-10");
    expect(slots.every((slot) => new Date(`${slot.date}T00:00:00Z`).getUTCDay() !== 5)).toBe(true);
  });

  it("removes a same-day window as soon as its start time is reached", () => {
    const now = new Date("2026-07-18T09:30:00.000Z"); // Saturday, 13:00 Tehran.
    const slots = createDeliverySlots(cart(1), now);

    expect(slots[0]?.id).toBe("2026-07-18-16");
    expect(slots[0]?.available).toBe(true);
  });
});
