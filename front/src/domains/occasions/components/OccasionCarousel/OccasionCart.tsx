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
  variant?: "public" | "private";
};

export default function OccasionCart({
  day,
  month,
  title,
  remainingDays,
  variant = "public",
}: Props) {
  const isUrgent = remainingDays < 8;
  const showRemainingDays = remainingDays > 0;

  return (
    <div
      className={`${styles.occasionDayCard} ${
        variant === "private" ? styles.occasionDayCardPrivate : ""
      }`}
      data-variant={variant}
    >
      <div className={styles.occasionDay}>{day}</div>
      <div className={styles.occasionMonth}>{month}</div>
      <div className={styles.occasionTitle}>{title}</div>

      {showRemainingDays && (
        <div
          className={`${styles.occasionRemaining} ${
            isUrgent ? styles.urgentRemaining : ""
          }`}
        >
          {remainingDays} روز مانده
        </div>
      )}

      <Button
        className={!showRemainingDays ? styles.occasionBtnNoRemaining : undefined}
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
