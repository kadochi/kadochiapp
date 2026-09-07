import { describe, expect, it } from "vitest";

import { toHomepageHeroSlides } from "./hero-slides";

const image = { alt: "Hero artwork", url: "https://example.com/hero.jpg" };

describe("toHomepageHeroSlides", () => {
  it("uses legacy slider fields when newer hero and banner records are absent", () => {
    expect(
      toHomepageHeroSlides({
        banners: [],
        dailySpecial: null,
        heroes: [],
        sliders: [{
          id: 7,
          sliderTitle: "ارسال امروز",
          sliderButtonText: "مشاهده هدایا",
          sliderLink: "https://example.com/products",
          backgroundImage: image,
        }],
        stories: [],
      }),
    ).toEqual([{
      id: 7,
      title: "ارسال امروز",
      subtitle: "",
      ctaText: "مشاهده هدایا",
      ctaLink: "https://example.com/products",
      backgroundImage: image.url,
    }]);
  });

  it("prefers hero records over compatibility fallbacks", () => {
    expect(
      toHomepageHeroSlides({
        banners: [],
        dailySpecial: null,
        heroes: [{
          id: 8,
          title: "Hero",
          subtitle: "",
          ctaText: "Open",
          ctaLink: null,
          backgroundImage: image,
        }],
        sliders: [{
          id: 7,
          sliderTitle: "Legacy slider",
          sliderButtonText: "Open",
          sliderLink: null,
          backgroundImage: image,
        }],
        stories: [],
      }),
    ).toEqual([{
      id: 8,
      title: "Hero",
      subtitle: "",
      ctaText: "Open",
      ctaLink: null,
      backgroundImage: image.url,
    }]);
  });
});
