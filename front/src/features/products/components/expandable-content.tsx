"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExpandable } from "../hooks/useExpandable";

export type ExpandableContentProps = {
  children: ReactNode;
};

/** Clamps server-rendered children to 10 lines with a toggle to expand. */
export function ExpandableContent({ children }: Readonly<ExpandableContentProps>) {
  const { contentRef, isExpanded, canExpand, toggle } = useExpandable<HTMLDivElement>();

  return (
    <>
      <div
        ref={contentRef}
        className={cn(
          "overflow-hidden transition-[max-height] duration-200 [direction:rtl]",
          "font-sans text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis",
          !isExpanded && "max-h-[calc(var(--text-body-14--line-height)*10)]",
        )}
      >
        {children}
      </div>

      {canExpand ? (
        <div className="mt-8 flex justify-center">
          <Button
            size="small"
            variant="link-ghost"
            onClick={toggle}
          >
            {isExpanded ? "نمایش کمتر" : "نمایش بیشتر"}
            {isExpanded ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}
          </Button>
        </div>
      ) : null}
    </>
  );
}
