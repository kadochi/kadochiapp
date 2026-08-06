import { describe, expect, it } from "vitest";
import { stripHtml } from "./strip-html";

describe("stripHtml", () => {
  it("decodes category descriptions with a double-escaped ellipsis", () => {
    expect(stripHtml("لوازم نقاشی و &amp;#8230;")).toBe("لوازم نقاشی و …");
  });

  it("keeps decoded text plain after removing HTML", () => {
    expect(stripHtml("<p>گل&nbsp;&amp; هدیه</p>")).toBe("گل & هدیه");
  });
});
