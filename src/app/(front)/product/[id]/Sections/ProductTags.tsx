// src/app/(front)/product/[id]/Sections/ProductTags/ProductTags.tsx
"use client";

import React from "react";
import Link from "next/link";
import s from "./ProductTags.module.css";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Chip from "@/components/ui/Chip/Chip";

type Tag = { id: number; name: string; slug?: string };

type Props = { tags?: Tag[] };

export default function ProductTags({ tags = [] }: Props) {
  if (!tags.length) return null;

  return (
    <section className={s.root} aria-label="تگ‌های محصول">
      <SectionHeader
        as="h3"
        title="تگ‌های محصول"
        subtitle="تگ‌های مرتبط با این کالا"
      />

      <div className={s.tagsWrap}>
        {tags.map((tag) => (
          <Link
            key={tag.id}
            href={`/products?tag=${encodeURIComponent(
              tag.slug || String(tag.id)
            )}`}
            prefetch={false}
            className={s.link}
          >
            <Chip state="default">{tag.name}</Chip>
          </Link>
        ))}
      </div>
    </section>
  );
}
