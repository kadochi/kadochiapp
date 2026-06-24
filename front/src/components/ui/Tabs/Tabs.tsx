"use client";

import React from "react";
import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string };

type Props = {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

export default function Tabs({ items, value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center border border-solid border-secondary-container rounded-rounded bg-surface-background p-2 gap-3",
        className
      )}
      dir="rtl"
    >
      {items.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "appearance-none border-none outline-none cursor-pointer rounded-rounded font-sans text-label-14 leading-label-14 font-normal px-4 py-3 w-full transition-all duration-250",
              active
                ? "bg-secondary text-secondary-on"
                : "bg-surface-background text-surface-neutral-high hover:bg-surface"
            )}
            onClick={() => onChange(tab.id)}
            role="tab"
            aria-selected={active}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
