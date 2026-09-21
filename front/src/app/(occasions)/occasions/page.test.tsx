import { describe, expect, it } from "vitest";

import { metadata } from "./page";

describe("occasions page SEO", () => {
  it("allows the canonical occasions page to be indexed", () => {
    expect(metadata.alternates?.canonical).toBe("/occasions");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });
});
