"use client";

import { useEffect, useRef, useState } from "react";

import { GiftFinderTrigger } from "@/features/gift-finder/components/gift-finder-trigger";
import { AnimatedProductSearch } from "@/features/products/components/product-search";
import { cn } from "@/lib/utils";

/** Shared mobile search row used by the homepage and product-list headers. */
export function MobileHeaderSearch() {
  const [isVisible, setIsVisible] = useState(true);
  const previousScrollY = useRef(0);
  const visibility = useRef(true);

  useEffect(() => {
    let frame: number | undefined;
    let settleTimer: number | undefined;
    let isTransitioning = false;

    const setVisibility = (visible: boolean) => {
      if (visible === visibility.current) return;

      visibility.current = visible;
      isTransitioning = true;
      setIsVisible(visible);
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        // Collapsing the sticky area can emit a scroll event of its own. Reset
        // the baseline after the transition so that event cannot reverse it.
        previousScrollY.current = window.scrollY;
        isTransitioning = false;
      }, 220);
    };

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;

      if (isTransitioning) {
        previousScrollY.current = currentScrollY;
        frame = undefined;
        return;
      }

      const scrollDelta = currentScrollY - previousScrollY.current;
      let nextVisibility: boolean | undefined;

      if (currentScrollY <= 8) {
        nextVisibility = true;
      } else if (scrollDelta >= 8) {
        nextVisibility = false;
      } else if (scrollDelta <= -8) {
        nextVisibility = true;
      }

      if (nextVisibility !== undefined) {
        previousScrollY.current = currentScrollY;
        setVisibility(nextVisibility);
      }

      frame = undefined;
    };

    const handleScroll = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(updateVisibility);
    };

    previousScrollY.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
      window.clearTimeout(settleTimer);
    };
  }, []);

  return (
    <div
      aria-hidden={!isVisible}
      className={cn(
        "grid overflow-hidden [overflow-anchor:none] transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
        isVisible ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
      )}
      inert={!isVisible}
    >
      <div className="min-h-0 overflow-hidden min-[864px]:hidden">
        <div className="flex items-center gap-8 px-16 pb-4 pt-8 [direction:rtl]">
          <AnimatedProductSearch className="min-w-0 flex-1" />
          <GiftFinderTrigger compact />
        </div>
      </div>
    </div>
  );
}
