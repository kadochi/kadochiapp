"use client";

import React from "react";
import s from "./ProductSpecs.module.css";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";

export type SpecItem = { name: string; value: string };

type Props = {
  items: SpecItem[] | null | undefined;
  className?: string;
  "aria-label"?: string;
};

export default function ProductSpecs({
  items,
  className,
  "aria-label": ariaLabel = "مشخصات محصول",
}: Props) {
  if (!items || items.length === 0) return null;

  return (
    <section className={className} dir="rtl">
      <SectionHeader as="h3" title="مشخصات محصول" subtitle="جدول ویژگی‌ها" />
      <div className={s.specTable} role="table" aria-label={ariaLabel}>
        {items.map((it, idx) => (
          <div key={idx} className={s.specRow} role="row">
            <div className={s.specKey} role="cell" aria-label="ویژگی">
              {it.name}
            </div>
            <div className={s.specValue} role="cell" aria-label="مقدار">
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
