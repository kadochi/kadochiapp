// src/domains/occasions/components/OccasionCarousel/OccasionCart.tsx
"use client";

import Link from "next/link";
import Button from "@/components/ui/Button/Button";
import styles from "./Occasion.module.css";

type Props = {
  day: string;
  month: string;
  title: string;
  remainingDays: number;
};

export default function OccasionCart({
  day,
  month,
  title,
  remainingDays,
}: Props) {
  const isUrgent = remainingDays < 8;

  return (
    <div className={styles.occasionDayCard}>
      <div className={styles.occasionDay}>{day}</div>
      <div className={styles.occasionMonth}>{month}</div>
      <div className={styles.occasionTitle}>{title}</div>

      <div
        className={`${styles.occasionRemaining} ${
          isUrgent ? styles.urgentRemaining : ""
        }`}
      >
        {remainingDays} روز مانده
      </div>

      <Button
        as={Link as any}
        href="/products"
        type="link"
        style="ghost"
        size="small"
        trailingIcon={<img src="/icons/chevron-left-black.svg" alt="" />}
        aria-label="خرید کادو"
      >
        خرید کادو
      </Button>
    </div>
  );
}
