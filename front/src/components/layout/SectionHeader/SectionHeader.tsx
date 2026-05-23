import React from "react";
import s from "./SectionHeader.module.css";

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  leftSlot?: React.ReactNode;
  labelSlot?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3" | "h4";
};

export default function SectionHeader({
  title,
  subtitle,
  leftSlot,
  labelSlot,
  className,
  as = "h2",
}: Props) {
  const Heading = as;

  return (
    <div className={`${s.root} ${className ?? ""}`} dir="rtl">
      <div className={s.content}>
        <div className={s.titleRow}>
          <Heading className={s.title}>{title}</Heading>
          {labelSlot ? <span className={s.labelSlot}>{labelSlot}</span> : null}
        </div>
        {subtitle ? <div className={s.subtitle}>{subtitle}</div> : null}
      </div>

      {leftSlot ? <div className={s.leftSlot}>{leftSlot}</div> : null}
    </div>
  );
}

/*
Usage examples:

// 1) تیتر + زیرتیتر + یک دکمه سمت چپ
import Button from "@/components/ui/Button/Button";
import Link from "next/link";

<SectionHeader
  title="جدیدترین محصولات"
  subtitle="این لیست مستقیم از WooCommerce خوانده می‌شود."
  leftSlot={
    <Button
      as={Link as any}
      href="/products"
      type="secondary"
      style="tonal"
      size="small"
      trailingIcon={<img src="/icons/arrow-left-purple.svg" alt="" />}
      aria-label="مشاهده همه محصولات"
    >
      مشاهده همه
    </Button>
  }
/>

// 2) بدون زیرتیتر و با چند اکشن
<SectionHeader
  title="محبوب‌ترین‌ها"
  leftSlot={
    <>
      <Button size="small" type="terتیary" style="outline">فیلتر</Button>
      <Button size="small" type="secondary" style="tonal">مشاهده همه</Button>
    </>
  }
/>

// 3) با Badge کنار تیتر
import Badge from "@/components/ui/Badge/Badge";
<SectionHeader
  title="پیشنهادی برای شما"
  labelSlot={<Badge color="primary">ویژه</Badge>}
  as="h3"
/>
*/
