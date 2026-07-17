import { useEffect, useMemo, useState } from "react";
import type { Swiper as SwiperClass } from "swiper/types";
import type { ProductImage } from "../types";

export type UseProductGalleryResult = {
  slides: readonly { src: string | undefined; alt: string; priority: boolean }[];
  activeThumbs: SwiperClass | null;
  setThumbsSwiper: (swiper: SwiperClass | null) => void;
  showThumbs: boolean;
};

/** Prepares gallery slides and defers the thumbnail strip to idle time. */
export function useProductGallery(images: readonly ProductImage[], title: string): UseProductGalleryResult {
  const slides = useMemo(
    () =>
      images.length
        ? images.map((image, index) => ({ src: image.url, alt: image.alt || title, priority: index === 0 }))
        : [{ src: undefined, alt: title, priority: true }],
    [images, title],
  );

  const [thumbsSwiper, setThumbsSwiper] = useState<SwiperClass | null>(null);
  const [showThumbs, setShowThumbs] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback !== "function") {
      const timeout = window.setTimeout(() => setShowThumbs(true), 1);
      return () => window.clearTimeout(timeout);
    }
    const id = window.requestIdleCallback(() => setShowThumbs(true));
    return () => window.cancelIdleCallback(id);
  }, []);

  return {
    slides,
    activeThumbs: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null,
    setThumbsSwiper,
    showThumbs,
  };
}
