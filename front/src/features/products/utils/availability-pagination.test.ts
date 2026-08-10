import { describe, expect, it } from "vitest";

import { availabilityFirstPage } from "./availability-pagination";

describe("availabilityFirstPage", () => {
  it("fills a page with available products before beginning unavailable products", () => {
    expect(availabilityFirstPage({ page: 2, perPage: 10, availableTotal: 15, unavailableTotal: 8 })).toEqual({
      total: 23,
      totalPages: 3,
      segments: [
        { partition: "available", page: 2, offset: 0, take: 5 },
        { partition: "unavailable", page: 1, offset: 0, take: 5 },
      ],
    });
  });

  it("continues unavailable products at their correct source-page offset", () => {
    expect(availabilityFirstPage({ page: 3, perPage: 10, availableTotal: 15, unavailableTotal: 18 })).toEqual({
      total: 33,
      totalPages: 4,
      segments: [
        { partition: "unavailable", page: 1, offset: 5, take: 5 },
        { partition: "unavailable", page: 2, offset: 0, take: 5 },
      ],
    });
  });

  it("does not skip unavailable products on later pages after an uneven boundary", () => {
    expect(availabilityFirstPage({ page: 4, perPage: 10, availableTotal: 15, unavailableTotal: 28 })).toEqual({
      total: 43,
      totalPages: 5,
      segments: [
        { partition: "unavailable", page: 2, offset: 5, take: 5 },
        { partition: "unavailable", page: 3, offset: 0, take: 5 },
      ],
    });
  });

  it("limits the final segment to the remaining unavailable products", () => {
    expect(availabilityFirstPage({ page: 4, perPage: 10, availableTotal: 15, unavailableTotal: 18 })).toEqual({
      total: 33,
      totalPages: 4,
      segments: [{ partition: "unavailable", page: 2, offset: 5, take: 3 }],
    });
  });

  it("keeps a fully available page within the available partition", () => {
    expect(availabilityFirstPage({ page: 2, perPage: 10, availableTotal: 31, unavailableTotal: 4 })).toMatchObject({
      total: 35,
      totalPages: 4,
      segments: [{ partition: "available", page: 2, offset: 0, take: 10 }],
    });
  });
});
