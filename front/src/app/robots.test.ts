import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/env", () => ({
  env: { KADOCHI_FRONTEND_URL: "https://kadochi.example" },
}));

import robots from "./robots";

describe("robots", () => {
  it("allows crawlers to reach the occasions page", () => {
    const rules = robots().rules;
    const disallowed = (Array.isArray(rules) ? rules : [rules]).flatMap((rule) =>
      Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [],
    );

    expect(disallowed).not.toContain("/occasions");
  });
});
