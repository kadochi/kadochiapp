"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Item = { q: string; a: string };

export default function Accordion({ items }: { items: Item[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="flex w-full flex-col gap-3" dir="rtl">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            className="w-full overflow-hidden rounded-m border border-solid border-border-low bg-surface-background"
          >
            <button
              type="button"
              className="flex w-full cursor-pointer flex-row-reverse items-center justify-between px-5 py-4 text-body-16 leading-body-16 text-text-primary font-sans"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="flex-1 text-right">{item.q}</span>
              <span className="shrink-0 text-2xl leading-none ms-4">
                {isOpen ? "−" : "+"}
              </span>
            </button>
            {isOpen && (
              <div className="px-5 pb-4 text-body-14 leading-body-14 text-text-secondary text-right">
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
