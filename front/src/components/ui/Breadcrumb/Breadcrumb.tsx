"use client";

import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

export type Crumb = { label: string; href?: string };

type Props = { items: Crumb[]; className?: string };

export default function Breadcrumb({ items, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    el.scrollLeft = 0;
  }, [items]);

  const lastIndex = items.length - 1;

  return (
    <nav
      aria-label="breadcrumb"
      className={cn(
        "block box-border overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-none px-4 py-3",
        className
      )}
      ref={wrapRef}
      dir="rtl"
    >
      <ol className="m-0 list-none p-0 inline-flex items-center gap-2">
        {items.map((it, i) => {
          const isCurrent = i === lastIndex;
          const showSep = i !== 0;
          return (
            <li key={i} className="inline-flex items-center gap-2">
              {showSep && (
                <span className="text-surface-neutral-low select-none pointer-events-none">/</span>
              )}
              {it.href && !isCurrent ? (
                <a
                  href={it.href}
                  className="text-surface-neutral-mid text-label-12 leading-label-12 font-normal inline-flex items-center no-underline hover:text-surface-neutral-high"
                >
                  {it.label}
                </a>
              ) : (
                <span
                  className={cn(
                    "text-label-12 leading-label-12 inline-flex items-center",
                    isCurrent
                      ? "text-surface-neutral-high font-bold cursor-default"
                      : "text-surface-neutral-mid font-normal"
                  )}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {it.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
