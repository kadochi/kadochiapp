"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { homepageContentSchema } from "@/features/content/schema/content";
import { bffJson } from "@/lib/http/browser";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type HeroBannerProps = {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string | null;
  backgroundImage: string;
  className?: string;
};

type HeroSlide = Omit<HeroBannerProps, "className"> & {
  id: number;
};

type HeroSliderProps = {
  /**
   * Server-rendered editorial content from the homepage contract. Supplying it
   * avoids a second request after hydration while retaining the BFF fallback.
   */
  initialSlides?: readonly HeroSlide[];
};

const heroEndpoint = "/api/content/home";

function HeroBanner({
  title,
  ctaText,
  ctaLink = "#",
  backgroundImage,
  className,
}: HeroBannerProps) {
  return (
    <div
      className={cn(
        "relative isolate aspect-[1.31/1] w-full overflow-hidden bg-cover bg-center bg-no-repeat min-[860px]:aspect-[2.87/1]",
        "after:pointer-events-none after:absolute after:inset-0 after:z-0 after:bg-[linear-gradient(0deg,rgba(54,6,74,0.8)_0%,rgba(96,4,135,0.56)_100%)]",
        className,
      )}
      dir="rtl"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="absolute inset-0 z-10 flex items-end justify-between px-24 pb-56 min-[860px]:hidden">
        <HeroTitle className="w-128 text-right text-heading-24" title={title} />
        {ctaText && (
          <HeroCallToAction href={ctaLink} label={ctaText} size="small" />
        )}
      </div>

      <div className="absolute inset-0 z-10 hidden place-content-center place-items-center gap-16 px-24 text-center min-[860px]:grid">
        <HeroTitle className="text-center text-[40px] leading-[48px]" title={title} />
        {ctaText && (
          <HeroCallToAction href={ctaLink} label={ctaText} size="medium" />
        )}
      </div>
    </div>
  );
}

function HeroTitle({ className, title }: { className: string; title: string }) {
  return (
    <h2
      className={cn(
        "m-0 break-words font-sans font-bold",
        "bg-[linear-gradient(90deg,var(--color-primary-gradient),var(--color-primary-container),var(--color-primary-gradient))] bg-[length:200%_100%] bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [animation:hero-text-shimmer_4s_ease-in-out_infinite]",
        className,
      )}
    >
      {title}
    </h2>
  );
}

function HeroCallToAction({
  href,
  label,
  size,
}: {
  href: string | null;
  label: string;
  size: "small" | "medium";
}) {
  return (
    <Button
      asChild
      aria-label={label}
      className="w-auto flex-none !text-on-secondary"
      size={size}
      variant="link-ghost"
    >
      <Link href={href || "#"}>
        {label}
        <ChevronLeft aria-hidden="true" />
      </Link>
    </Button>
  );
}

function HeroSliderPlaceholder() {
  return (
    <div
      aria-hidden="true"
      className="relative isolate aspect-[1.31/1] w-full overflow-hidden rounded-xxl bg-surface min-[860px]:aspect-[3/1.01]"
    >
      <div className="absolute inset-0 rounded-xxl bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite]" />
      <div className="absolute inset-x-0 bottom-10 mx-auto h-10 w-56 rounded-rounded bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite]" />
    </div>
  );
}

function toHeroSlides(data: unknown): HeroSlide[] {
  const parsed = homepageContentSchema.safeParse(data);

  if (!parsed.success) {
    return [];
  }

  return parsed.data.heroes.flatMap((hero) => {
    const backgroundImage = hero.backgroundImage?.url;

    return hero.title && backgroundImage
      ? [
          {
            id: hero.id,
            title: hero.title,
            ctaText: hero.ctaText,
            ctaLink: hero.ctaLink,
            backgroundImage,
          },
        ]
      : [];
  });
}

function HeroSlider({ initialSlides }: Readonly<HeroSliderProps>) {
  const [slides, setSlides] = useState<HeroSlide[]>(() =>
    initialSlides ? [...initialSlides] : [],
  );
  const hasMultipleSlides = slides.length > 1;

  useEffect(() => {
    if (initialSlides) {
      return;
    }

    const controller = new AbortController();

    void bffJson(heroEndpoint, { signal: controller.signal }, toHeroSlides)
      .then((nextSlides) => {
        if (!controller.signal.aborted) {
          setSlides(nextSlides);
        }
      })
      .catch(() => {
        // Keep the existing loading placeholder visible when editorial content
        // cannot be loaded, matching the legacy component's failure state.
      });

    return () => controller.abort();
  }, [initialSlides]);

  return (
    <section
      aria-label="اسلایدر بنر"
      aria-live="polite"
      aria-roledescription="carousel"
      className="px-16"
      data-component="hero-slider"
      dir="rtl"
      role="region"
    >
      {slides.length === 0 ? (
        <HeroSliderPlaceholder />
      ) : (
        <Swiper
          allowTouchMove={hasMultipleSlides}
          autoplay={
            hasMultipleSlides
              ? { delay: 10_000, disableOnInteraction: false }
              : false
          }
          className="w-full overflow-hidden rounded-xxl [&_.swiper-pagination]:bottom-8 [&_.swiper-pagination]:text-center [&_.swiper-pagination]:[direction:ltr] [&_.swiper-pagination-bullet]:mx-24 [&_.swiper-pagination-bullet]:h-14 [&_.swiper-pagination-bullet]:w-14 [&_.swiper-pagination-bullet]:rounded-s [&_.swiper-pagination-bullet]:border-2 [&_.swiper-pagination-bullet]:border-surface-background [&_.swiper-pagination-bullet]:bg-transparent [&_.swiper-pagination-bullet]:opacity-100 [&_.swiper-pagination-bullet]:transition-all [&_.swiper-pagination-bullet]:duration-100 [&_.swiper-pagination-bullet]:ease-[ease] [&_.swiper-pagination-bullet-active]:h-14 [&_.swiper-pagination-bullet-active]:w-24 [&_.swiper-pagination-bullet-active]:bg-surface-background"
          key={hasMultipleSlides ? "loop" : "no-loop"}
          loop={hasMultipleSlides}
          modules={[Autoplay, Pagination]}
          pagination={hasMultipleSlides ? { clickable: true } : false}
          slidesPerView={1}
          watchOverflow
        >
          {slides.map((slide, index) => (
            <SwiperSlide
              aria-label={`اسلاید ${index + 1} از ${slides.length}`}
              className="block aspect-[1.31/1] w-full overflow-hidden bg-cover bg-center bg-no-repeat min-[860px]:aspect-[3/1.01]"
              key={slide.id}
              role="group"
            >
              <HeroBanner {...slide} />
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}

export { HeroBanner, HeroSlider };
export type {
  HeroBannerProps,
  HeroBannerProps as BannerProps,
  HeroSlide,
  HeroSliderProps,
};
export default HeroSlider;
