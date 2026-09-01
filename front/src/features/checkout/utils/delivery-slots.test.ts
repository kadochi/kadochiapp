import { describe, expect, it } from "vitest";

import { createDeliverySlots } from "./delivery-slots";

const cart = (preparationHours: number) => ({
  items: [{ preparationHours }],
}) as Parameters<typeof createDeliverySlots>[0];

describe("createDeliverySlots", () => {
  it("only enables same-day windows that leave enough preparation time", () => {
    const now = new Date("2026-07-18T04:30:00.000Z"); // Saturday, 08:00 Tehran.
    const slots = createDeliverySlots(cart(4), now);

    expect(slots.slice(0, 4).map((slot) => [slot.id, slot.available])).toEqual([
      ["2026-07-18-10", true],
      ["2026-07-18-13", true],
      ["2026-07-18-16", true],
      ["2026-07-18-19", true],
    ]);
  });

  it("keeps today's disabled windows visible when 24 hours are needed after a 9 PM order", () => {
    const now = new Date("2026-07-18T17:30:00.000Z"); // Saturday, 21:00 Tehran.
    const slots = createDeliverySlots(cart(24), now);

    expect(slots.slice(0, 4).map((slot) => [slot.id, slot.available])).toEqual([
      ["2026-07-18-10", false],
      ["2026-07-18-13", false],
      ["2026-07-18-16", false],
      ["2026-07-18-19", false],
    ]);
    expect(slots.find((slot) => slot.available)?.id).toBe("2026-07-19-19");
  });

  it("uses the longest preparation time in a mixed cart", () => {
    const now = new Date("2026-07-18T04:30:00.000Z"); // Saturday, 08:00 Tehran.
    const slots = createDeliverySlots({ items: [{ preparationHours: 4 }, { preparationHours: 30 }] } as Parameters<typeof createDeliverySlots>[0], now);

    expect(slots.find((slot) => slot.available)?.id).toBe("2026-07-19-13");
  });

  it("includes Fridays but disables all of their delivery windows", () => {
    const now = new Date("2026-07-16T04:30:00.000Z"); // Thursday, 08:00 Tehran.
    const slots = createDeliverySlots(cart(24), now);

    expect(slots[0]?.id).toBe("2026-07-16-10");
    expect(slots.find((slot) => slot.available)?.id).toBe("2026-07-18-10");
    expect(slots.filter((slot) => new Date(`${slot.date}T00:00:00Z`).getUTCDay() === 5).every((slot) => !slot.available)).toBe(true);
  });

  it("keeps past same-day windows visible but disables them", () => {
    const now = new Date("2026-07-18T09:30:00.000Z"); // Saturday, 13:00 Tehran.
    const slots = createDeliverySlots(cart(1), now);

    expect(slots.slice(0, 4).map((slot) => [slot.id, slot.available])).toEqual([
      ["2026-07-18-10", false],
      ["2026-07-18-13", true],
      ["2026-07-18-16", true],
      ["2026-07-18-19", true],
    ]);
  });

  it("keeps the 19:00–22:00 slot available when preparation finishes before it ends", () => {
    const now = new Date("2026-07-18T14:30:00.000Z"); // Saturday, 18:00 Tehran.
    const slots = createDeliverySlots(cart(3), now);

    expect(slots.find((slot) => slot.id === "2026-07-18-19")).toMatchObject({
      endHour: 22,
      available: true,
    });
  });

  it("offers four calendar days starting today", () => {
    const now = new Date("2026-07-18T04:30:00.000Z"); // Saturday, 08:00 Tehran.
    const slots = createDeliverySlots(cart(1), now);

    expect([...new Set(slots.map((slot) => slot.date))]).toEqual([
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
      "2026-07-21",
    ]);
  });
});
