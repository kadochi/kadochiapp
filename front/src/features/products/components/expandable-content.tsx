"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useExpandable } from "../hooks/useExpandable";

export type ExpandableContentProps = {
  children: ReactNode;
};

/** Clamps server-rendered children to ten lines with a fade and a toggle to expand. */
export function ExpandableContent({ children }: Readonly<ExpandableContentProps>) {
  const { contentRef, isExpanded, canExpand, toggle } = useExpandable<HTMLDivElement>();
  const shouldFade = canExpand && !isExpanded;

  return (
    <>
      <div
        ref={contentRef}
        className={cn(
          "overflow-hidden transition-[max-height] duration-200 [direction:rtl]",
          "font-sans text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis",
          !isExpanded && "max-h-[calc(var(--text-body-14--line-height)*10)]",
        )}
        style={shouldFade ? {
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 20%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 0%, black 20%, transparent 100%)",
        } : undefined}
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
