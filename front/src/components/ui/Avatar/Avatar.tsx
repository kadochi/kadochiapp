"use client";

import React from "react";
import Image from "next/image";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const avatarVariants = cva(
  "relative inline-flex items-center justify-center rounded-full overflow-hidden bg-secondary-container text-secondary font-sans font-bold",
  {
    variants: {
      size: {
        small: "w-6 h-6 text-xs [--icon-size:12px]",
        medium: "w-10 h-10 text-sm [--icon-size:24px]",
        large: "w-14 h-14 text-lg [--icon-size:32px]",
        xlarge: "w-20 h-20 text-2xl [--icon-size:48px]",
      },
    },
    defaultVariants: { size: "medium" },
  }
);

type Props = VariantProps<typeof avatarVariants> & {
  src?: string;
  alt?: string;
  name?: string;
  initials?: string;
  className?: string;
};

function getInitials(input?: string): string | undefined {
  if (!input) return;
  const parts = input.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return;
  if (parts.length === 1) return parts[0][0]?.toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Avatar({
  size = "medium",
  src,
  alt,
  name,
  initials,
  className,
}: Props) {
  const cls = cn(avatarVariants({ size }), className);
  const text = (initials || getInitials(name || alt))?.slice(0, 2);

  return (
    <span className={cls} aria-label={alt}>
      {src ? (
        <Image
          className="absolute inset-0 h-full w-full object-cover"
          src={src}
          alt={alt ?? ""}
          fill
          sizes="100%"
        />
      ) : text ? (
        <span
          className="z-1 leading-none bg-gradient-to-l from-secondary to-secondary-gradient bg-clip-text text-transparent"
          aria-hidden
        >
          {text}
        </span>
      ) : (
        <img
          className="z-1 inline-block"
          style={{ width: "var(--icon-size)", height: "var(--icon-size)" }}
          src="/icons/user-purple.svg"
          alt="user icon"
          aria-hidden
        />
      )}
    </span>
  );
}
