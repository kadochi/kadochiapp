"use client";

import Lottie from "lottie-react";

import celebration from "@/assets/Celebration.json";

/** The celebratory overlay used by the legacy order-success screen. */
export function OrderCelebration() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[2000] size-full" aria-hidden>
      <Lottie animationData={celebration} autoplay loop style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
