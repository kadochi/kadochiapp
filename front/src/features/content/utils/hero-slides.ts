import type { HomepageContent } from "../types";

export type HomepageHeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string | null;
  backgroundImage: string;
};

type ImageBackedSlide = Omit<HomepageHeroSlide, "backgroundImage" | "subtitle"> & {
  subtitle?: string;
  backgroundImage: string | undefined;
};

function imageBackedSlide({
  id,
  title,
  subtitle = "",
  ctaText,
  ctaLink,
  backgroundImage,
}: ImageBackedSlide): HomepageHeroSlide[] {
  return title && backgroundImage
    ? [{ id, title, subtitle, ctaText, ctaLink, backgroundImage }]
    : [];
}

/**
 * Converts every supported editorial record into the homepage hero format.
 *
 * `slider` is retained for installations whose existing homepage artwork was
 * authored with the legacy Image Slider fields. The old app read `hero`
 * records directly, so current hero records remain the first choice.
 */
export function toHomepageHeroSlides(content: HomepageContent): HomepageHeroSlide[] {
  const heroes = content.heroes.flatMap((hero) =>
    imageBackedSlide({
      id: hero.id,
      title: hero.title,
      subtitle: hero.subtitle,
      ctaText: hero.ctaText,
      ctaLink: hero.ctaLink,
      backgroundImage: hero.backgroundImage?.url,
    }),
  );

  if (heroes.length) return heroes;

  const banners = content.banners.flatMap((banner) =>
    imageBackedSlide({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      ctaText: banner.ctaText,
      ctaLink: banner.ctaLink,
      backgroundImage: banner.backgroundImage?.url,
    }),
  );

  if (banners.length) return banners;

  return content.sliders.flatMap((slider) =>
    imageBackedSlide({
      id: slider.id,
      title: slider.sliderTitle,
      ctaText: slider.sliderButtonText,
      ctaLink: slider.sliderLink,
      backgroundImage: slider.backgroundImage?.url,
    }),
  );
}
