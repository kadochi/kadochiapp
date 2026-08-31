import { describe, expect, it } from "vitest";

import { deliveryBadge, formatPreparationTime, isSameDayDeliveryProduct } from "./preparation-time";

describe("formatPreparationTime", () => {
  it("uses hours below one day and rounded-up days from one day onward", () => {
    expect(formatPreparationTime(4)).toBe("۴ ساعت");
    expect(formatPreparationTime(24)).toBe("۱ روز");
    expect(formatPreparationTime(25)).toBe("۲ روز");
    expect(formatPreparationTime(48)).toBe("۲ روز");
  });
});

describe("deliveryBadge", () => {
  it("only promises same-day delivery when checkout has a usable slot", () => {
    const morning = new Date("2026-07-18T04:30:00.000Z"); // Saturday, 08:00 Tehran.
    const lateAfternoon = new Date("2026-07-18T14:30:00.000Z"); // Saturday, 18:00 Tehran.

    expect(deliveryBadge(3, morning)).toEqual({ label: "ارسال فوری تهران", usesFastDeliveryIcon: true });
    expect(deliveryBadge(4, morning)).toEqual({ label: "ارسال سریع امروز", usesFastDeliveryIcon: true });
    expect(deliveryBadge(7, morning)).toEqual({ label: "ارسال سریع امروز", usesFastDeliveryIcon: true });
    expect(deliveryBadge(6, lateAfternoon)).toEqual({ label: "تحویل از فردا", usesFastDeliveryIcon: false });
    expect(deliveryBadge(25, morning)).toEqual({ label: "ارسال ۲ روز کاری", usesFastDeliveryIcon: false });

    expect(isSameDayDeliveryProduct(7, morning)).toBe(true);
    expect(isSameDayDeliveryProduct(6, lateAfternoon)).toBe(false);
  });
});
