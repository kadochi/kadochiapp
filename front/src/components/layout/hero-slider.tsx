"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Autoplay, Pagination } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/pagination";
import { heroSlideListSchema, type HeroSlide as ContentHeroSlide } from "@/features/content/utils/hero-posts";
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
  priority?: boolean;
};

type HeroSlide = ContentHeroSlide;

type HeroSliderProps = {
  /**
   * Server-rendered editorial Hero content. Supplying it
   * avoids a second request after hydration while retaining the BFF fallback.
   */
  initialSlides?: readonly HeroSlide[];
};

const heroEndpoint = "/api/content/heroes";

function HeroBanner({
  title,
  subtitle,
  ctaText,
  ctaLink = "#",
  backgroundImage,
  className,
  priority = false,
}: HeroBannerProps) {
  return (
    <div
      className={cn(
        "relative isolate aspect-[1/1.2] w-full bg-[linear-gradient(to_bottom,var(--color-secondary),var(--color-on-secondary-container))] bg-cover bg-center bg-no-repeat min-[860px]:aspect-[2.87/1]",
        className,
      )}
      dir="rtl"
    >
      <Image
        alt=""
        aria-hidden
        className="object-cover"
        fetchPriority={priority ? "high" : "auto"}
        fill
        loading={priority ? undefined : "lazy"}
        preload={priority}
        sizes="(min-width: 860px) min(100vw, 1440px), calc(100vw - 24px)"
        src={backgroundImage}
      />
      <div className="absolute inset-0 z-10 grid content-center justify-items-center gap-16 px-24 py-16 text-center">
        <HeroTitle className="w-[10rem] text-center text-[32px] leading-[40px] min-[860px]:w-auto min-[860px]:max-w-[32rem] min-[860px]:text-[40px] min-[860px]:leading-[48px]" title={title} />
        {subtitle ? (
          <p className="m-0 w-[200px] text-label-12 leading-[20px] text-on-primary min-[860px]:w-auto min-[860px]:max-w-256">
            {subtitle}
          </p>
        ) : null}
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
      className="w-auto flex-none !text-on-primary"
      size={size}
      variant="link-ghost"
    >
      <Link href={href || "#"} prefetch={false}>
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
      className="relative isolate aspect-[1/1.2] w-full overflow-hidden rounded-xl bg-surface min-[860px]:aspect-[3/1.01]"
    >
      <div className="absolute inset-0 rounded-xl bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite]" />
      <div className="absolute inset-x-0 bottom-10 mx-auto h-10 w-56 rounded-rounded bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite]" />
    </div>
  );
}

function toHeroSlides(data: unknown): HeroSlide[] {
  const parsed = heroSlideListSchema.safeParse(data);

  if (!parsed.success) {
    return [];
  }

  return parsed.data;
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
      className="mx-auto w-[calc(100%-1.5rem)] max-w-[400px] min-[860px]:w-full min-[860px]:max-w-none min-[860px]:px-16"
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
          className="hero-slider w-full overflow-hidden rounded-xl"
          key={hasMultipleSlides ? "loop" : "no-loop"}
          loop={hasMultipleSlides}
          modules={[Autoplay, Pagination]}
          pagination={{
            clickable: true,
            renderBullet: (index, className) =>
              `<button aria-label="نمایش اسلاید ${index + 1}" class="${className} hero-slider__pagination-segment" type="button"><span class="hero-slider__pagination-progress"></span></button>`,
          }}
          slidesPerView={1}
        >
          {slides.map((slide, index) => (
            <SwiperSlide
              aria-label={`اسلاید ${index + 1} از ${slides.length}`}
              className="block aspect-[1/1.2] w-full bg-cover bg-center bg-no-repeat min-[860px]:aspect-[3/1.01]"
              key={slide.id}
              role="group"
            >
              <HeroBanner {...slide} priority={index === 0} />
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
