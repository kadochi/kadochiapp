import Link from "next/link";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { rememberGiftFinderReturnScroll } from "@/features/gift-finder/gift-finder-route-state";
import { cn } from "@/lib/utils";

import styles from "./gift-finder-trigger.module.css";

function FinderIcon() {
  const gradientId = useId().replaceAll(":", "");

  return (
    <svg
      aria-hidden="true"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          spreadMethod="repeat"
          x1="-24"
          x2="48"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--color-error)" />
          <stop offset="0.111" stopColor="var(--color-secondary)" />
          <stop offset="0.222" stopColor="var(--color-warning)" />
          <stop offset="0.333" stopColor="var(--color-error)" />
          <stop offset="0.444" stopColor="var(--color-secondary)" />
          <stop offset="0.555" stopColor="var(--color-warning)" />
          <stop offset="0.666" stopColor="var(--color-error)" />
          <stop offset="0.777" stopColor="var(--color-secondary)" />
          <stop offset="0.888" stopColor="var(--color-warning)" />
          <stop offset="1" stopColor="var(--color-error)" />
          <animateTransform
            attributeName="gradientTransform"
            className={styles.gradientMotion}
            dur="3.6s"
            from="0 0"
            repeatCount="indefinite"
            to="24 0"
            type="translate"
          />
        </linearGradient>
      </defs>

      <g stroke={`url(#${gradientId})`}>
        <circle cx="10.25" cy="10.25" r="5.75" />
        <path d="m14.5 14.5 4.25 4.25" />
        <path d="M18 3.25v3.5M16.25 5h3.5M20.25 9.25v2.5M19 10.5h2.5" />
      </g>
    </svg>
  );
}

export function GiftFinderTrigger({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Button
      asChild
      className={cn(
        styles.trigger,
        "border-2 text-label-14 leading-[var(--text-label-14--line-height)] hover:bg-surface-background",
        compact && "size-48 shrink-0 px-0",
        className,
      )}
      size="medium"
      variant="tertiary-outline"
    >
      <Link
        aria-label="جستجوی کادوی مناسب"
        href="/gift-finder"
        onKeyDown={(event) => {
          if (event.key === "Enter") rememberGiftFinderReturnScroll();
        }}
        onPointerDown={rememberGiftFinderReturnScroll}
      >
        <FinderIcon />
        <span className={compact ? "sr-only" : undefined}>کادو چی بخرم؟</span>
      </Link>
    </Button>
  );
}
