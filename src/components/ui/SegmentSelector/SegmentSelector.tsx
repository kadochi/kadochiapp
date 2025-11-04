"use client";

import React from "react";
import s from "./SegmentSelector.module.css";

export type SegmentItem = { id: string; label: string };

type Props = {
  items: SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
};

function cx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function SegmentSelector({
  items,
  value,
  onChange,
  className,
}: Props) {
  return (
    <div className={cx(s.root, className)} role="radiogroup" dir="rtl">
      {items.map((it, idx) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={cx(s.item, active && s.active, idx !== 0 && s.withSep)}
            onClick={() => onChange(it.id)}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
