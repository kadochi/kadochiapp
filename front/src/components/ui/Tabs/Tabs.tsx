"use client";

import React from "react";
import s from "./Tabs.module.css";

export interface TabItem {
  id: string;
  label: string;
}

interface Props {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function Tabs({ items, value, onChange, className }: Props) {
  return (
    <div className={`${s.root} ${className || ""}`}>
      {items.map((t) => {
        const active = value === t.id;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            className={s.btn}
            onClick={() => onChange(t.id)}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
