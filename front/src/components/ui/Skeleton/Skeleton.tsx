"use client";

import React from "react";
import { cn } from "@/lib/cn";

export default function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700", className)}
      style={style}
    />
  );
}
