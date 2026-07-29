import { describe, expect, it } from "vitest";

import { mapHeroPosts } from "./hero-posts";

const baseAcf = {
  title: "ارسال سریع امروز",
  subtitle: "هدیه‌تان را به‌موقع می‌رسانیم",
  cta_text: "مشاهده هدایا",
  cta_link: "https://example.com/products",
};

describe("mapHeroPosts", () => {
  it("maps SCF image URL strings", () => {
    expect(mapHeroPosts([{ id: 4, acf: { ...baseAcf, background_image: "https://example.com/hero.jpg" } }])).toEqual([{
      id: 4,
      title: baseAcf.title,
      subtitle: baseAcf.subtitle,
      ctaText: baseAcf.cta_text,
      ctaLink: baseAcf.cta_link,
      backgroundImage: "https://example.com/hero.jpg",
    }]);
  });

  it("maps SCF image objects and defaults optional fields", () => {
    expect(mapHeroPosts([{
      id: 5,
      acf: { title: "Hero", background_image: { url: "https://example.com/hero.jpg" } },
    }])).toEqual([{
      id: 5,
      title: "Hero",
      subtitle: "",
      ctaText: "",
      ctaLink: null,
      backgroundImage: "https://example.com/hero.jpg",
    }]);
  });

  it("drops malformed records and posts without a title or usable image", () => {
    expect(mapHeroPosts([
      { id: 1, acf: { ...baseAcf, background_image: "not a URL" } },
      { id: 2, acf: { ...baseAcf, title: "", background_image: "https://example.com/hero.jpg" } },
      { id: 3, acf: { ...baseAcf } },
      { id: "4", acf: { ...baseAcf, background_image: "https://example.com/hero.jpg" } },
      null,
    ])).toEqual([]);
  });
});
