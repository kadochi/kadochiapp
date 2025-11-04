"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import Button from "@/components/ui/Button/Button";
import s from "./ProductDescription.module.css";

type Props = { html: string };

const COLLAPSED_LINES = 10;

export default function ProductDescription({ html }: Props) {
  if (!html) return null;

  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number>(0);
  const [fullHeight, setFullHeight] = useState<number>(0);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const cs = window.getComputedStyle(el);
    const lhStr = cs.lineHeight;
    const lineHeight = lhStr.endsWith("px")
      ? parseFloat(lhStr)
      : parseFloat(cs.fontSize) * 1.5;

    const collapsed = Math.ceil(lineHeight * COLLAPSED_LINES);
    setCollapsedHeight(collapsed);

    const prev = el.style.maxHeight;
    el.style.maxHeight = "none";
    const full = el.scrollHeight;
    setFullHeight(full);
    el.style.maxHeight = prev;

    setCanCollapse(full > collapsed + 8);
  }, [html]);

  const maxHeight = useMemo(() => {
    if (!canCollapse) return "none";
    return expanded ? `${fullHeight}px` : `${collapsedHeight}px`;
  }, [canCollapse, expanded, fullHeight, collapsedHeight]);

  return (
    <section className={s.descSection}>
      <div
        ref={contentRef}
        className={s.content}
        dir="rtl"
        style={{ maxHeight }}
        data-expanded={expanded ? "true" : "false"}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {canCollapse && (
        <div className={s.actions}>
          <Button
            type="link"
            style="ghost"
            size="small"
            onClick={() => setExpanded((p) => !p)}
            trailingIcon={
              expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />
            }
          >
            {expanded ? "نمایش کمتر" : "نمایش بیشتر"}
          </Button>
        </div>
      )}
    </section>
  );
}
