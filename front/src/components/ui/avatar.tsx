"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";
import { UserRound } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const avatarVariants = cva(
  [
    "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
    "bg-secondary-container font-sans font-bold text-secondary",
    "[&>img]:absolute [&>img]:inset-0 [&>img]:size-full [&>img]:object-cover",
  ],
  {
    variants: {
      size: {
        sm: "size-24 text-label-10 [&_svg]:size-12",
        md: "size-40 text-label-14 [&_svg]:size-24",
        lg: "size-56 text-title-18 [&_svg]:size-32",
        xl: "size-80 text-heading-24 [&_svg]:size-48",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type AvatarProps = Omit<
  ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
  "children"
> &
  VariantProps<typeof avatarVariants> & {
    /** Image URL. When it cannot load, the fallback is shown. */
    src?: string;
    /** Accessible name for the avatar and source for the automatic initials. */
    alt?: string;
    /** Replaces the automatic initials or default user icon. */
    fallback?: ReactNode;
  };

function getInitials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean);

  if (!parts?.length) return;
  if (parts.length === 1) return parts[0][0]?.toUpperCase();

  return `${parts[0][0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function Avatar({
  src,
  alt,
  fallback,
  size,
  className,
  "aria-label": ariaLabel,
  ...props
}: AvatarProps) {
  const accessibleName = ariaLabel ?? alt;
  const fallbackContent = fallback ?? getInitials(alt) ?? <UserRound aria-hidden="true" />;
  const isTextFallback = typeof fallbackContent === "string";

  return (
    <AvatarPrimitive.Root
      {...props}
      aria-hidden={accessibleName ? undefined : true}
      aria-label={accessibleName}
      className={cn(avatarVariants({ size }), className)}
      role={accessibleName ? "img" : undefined}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" /> : null}
      <AvatarPrimitive.Fallback
        aria-hidden="true"
        className={cn(
          "inline-flex items-center justify-center leading-none",
          isTextFallback &&
            "bg-clip-text text-transparent [background-image:linear-gradient(to_left,var(--color-secondary),var(--color-secondary-gradient))]",
        )}
      >
        {fallbackContent}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export { Avatar, avatarVariants };
export type { AvatarProps };
