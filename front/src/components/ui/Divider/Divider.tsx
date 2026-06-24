"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const dividerVariants = cva("m-0 w-full border-none p-0", {
  variants: {
    type: {
      divider: "h-px bg-border-low",
      spacer: "h-2 bg-surface lg:h-4 lg:bg-surface-background",
    },
    variant: {
      "full-width": "",
      "with-padding": "mx-4 w-[calc(100%-2rem)]",
    },
  },
  defaultVariants: {
    type: "divider",
    variant: "full-width",
  },
});

interface Props
  extends VariantProps<typeof dividerVariants> {
  className?: string;
}

export default function Divider({ type, variant, className }: Props) {
  return (
    <div
      className={cn(dividerVariants({ type, variant }), className)}
      aria-hidden="true"
    />
  );
}
