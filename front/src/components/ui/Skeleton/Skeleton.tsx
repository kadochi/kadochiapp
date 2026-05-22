"use client";

import React from "react";
import clsx from "clsx";

/**
 * Generic skeleton loader component
 * Use to render placeholder blocks during data loading.
 */
export default function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded-md",
        className
      )}
      style={style}
    />
  );
}
