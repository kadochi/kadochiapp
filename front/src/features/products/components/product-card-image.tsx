"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { Product } from "../types";

type ProductCardImageProps = {
  image: Product["images"][number];
  alt: string;
  priority: boolean;
  sizes: string;
};

/** Keeps each carousel card stable while its individual product image decodes. */
export function ProductCardImage({ image, alt, priority, sizes }: Readonly<ProductCardImageProps>) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (imageRef.current?.complete) setIsLoaded(true);
  }, []);

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-[linear-gradient(90deg,var(--color-surface-soft)_0%,var(--color-surface-dim)_50%,var(--color-surface-soft)_100%)] bg-[length:200%_100%] [animation:hero-skeleton-shimmer_1.2s_linear_infinite] transition-opacity duration-200",
          isLoaded && "opacity-0",
        )}
      />
      <Image
        alt={alt}
        className={cn(
          "absolute inset-0 size-full object-cover transition-opacity duration-200",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        fetchPriority={priority ? "high" : "auto"}
        fill
        loading={priority ? undefined : "lazy"}
        onError={() => setIsLoaded(true)}
        onLoad={() => setIsLoaded(true)}
        preload={priority}
        quality={55}
        ref={imageRef}
        sizes={sizes}
        src={image.url}
      />
    </>
  );
}
