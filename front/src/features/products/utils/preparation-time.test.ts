import { describe, expect, it } from "vitest";

import { deliveryBadge, formatPreparationTime } from "./preparation-time";

describe("formatPreparationTime", () => {
  it("uses hours below one day and rounded-up days from one day onward", () => {
    expect(formatPreparationTime(4)).toBe("۴ ساعت");
    expect(formatPreparationTime(24)).toBe("۱ روز");
    expect(formatPreparationTime(25)).toBe("۲ روز");
    expect(formatPreparationTime(48)).toBe("۲ روز");
  });
});

describe("deliveryBadge", () => {
  it("uses the requested delivery promise for every preparation-time band", () => {
    expect(deliveryBadge(3)).toEqual({ label: "ارسال فوری تهران", usesFastDeliveryIcon: true });
    expect(deliveryBadge(4)).toEqual({ label: "ارسال سریع امروز", usesFastDeliveryIcon: true });
    expect(deliveryBadge(6)).toEqual({ label: "ارسال سریع امروز", usesFastDeliveryIcon: true });
    expect(deliveryBadge(7)).toEqual({ label: "تحویل از فردا", usesFastDeliveryIcon: false });
    expect(deliveryBadge(24)).toEqual({ label: "تحویل از فردا", usesFastDeliveryIcon: false });
    expect(deliveryBadge(25)).toEqual({ label: "ارسال ۲ روز کاری", usesFastDeliveryIcon: false });
  });
});
