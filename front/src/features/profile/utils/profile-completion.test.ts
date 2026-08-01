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

  it("marks the profile complete only when each requested detail is present", () => {
    expect(getProfileCompletion({
      ...baseCustomer,
      firstName: "آیدین",
      lastName: "بهرمان",
      birthDate: "1990-01-10",
      gender: "male",
    })).toMatchObject({ completedCount: 4, percentage: 100, isComplete: true });
  });
});
