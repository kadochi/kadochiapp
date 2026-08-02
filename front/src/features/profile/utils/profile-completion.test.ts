import { describe, expect, it } from "vitest";

import { getProfileCompletion } from "./profile-completion";

const baseCustomer = {
  phone: "+989121234567",
  firstName: "",
  lastName: "",
  birthDate: null,
  gender: null,
};

describe("getProfileCompletion", () => {
  it("counts the verified mobile number as the first completed task", () => {
    expect(getProfileCompletion(baseCustomer)).toMatchObject({
      completedCount: 1,
      totalCount: 4,
      percentage: 25,
      isComplete: false,
    });
  });

  const regularCustomer = {
    ...baseCustomer,
    firstName: "آیدین",
    lastName: "بهرمان",
    birthDate: "1990-01-10",
    gender: "male",
  };

  it("unlocks the regular-user missions after the profile details are complete", () => {
    expect(getProfileCompletion(regularCustomer)).toMatchObject({ level: "regular", completedCount: 0, percentage: 0, isComplete: false });
  });

  it("promotes a regular user after every follow-up mission is complete", () => {
    expect(getProfileCompletion(regularCustomer, {
      hasAddress: true,
      hasFavorite: true,
      hasWishlist: true,
      hasPersonalProfile: true,
    })).toMatchObject({ level: "pro", completedCount: 4, percentage: 100, isComplete: true });
  });

  it("keeps the regular-user mission group incomplete until every mission is done", () => {
    expect(getProfileCompletion({
      ...baseCustomer,
      firstName: "آیدین",
      lastName: "بهرمان",
      birthDate: "1990-01-10",
      gender: "male",
    }, { hasAddress: true, hasFavorite: false, hasWishlist: true, hasPersonalProfile: true })).toMatchObject({ level: "regular", completedCount: 3, percentage: 75, isComplete: false });
  });
});
