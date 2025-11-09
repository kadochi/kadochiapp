"use client";

import Link from "next/link";
import Button from "@/components/ui/Button/Button";
import s from "./Hero.module.css";

export type BannerProps = {
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage: string;
  className?: string;
};

export default function Hero({
  title,
  ctaText,
  ctaLink = "#",
  backgroundImage,
  className,
}: BannerProps) {
  return (
    <div
      className={`${s.banner} ${className ?? ""}`}
      style={{ backgroundImage: `url(${backgroundImage})` }}
      dir="rtl"
    >
      <div className={s.row}>
        <h2 className={s.title}>{title}</h2>

        {ctaText && (
          <Button
            as={Link as any}
            href={ctaLink}
            type="link"
            style="ghost"
            size="small"
            className={s.ctaBtn}
            trailingIcon={
              <img
                src="/icons/chevron-left-white.svg"
                alt=""
                aria-hidden="true"
              />
            }
            aria-label={ctaText}
          >
            {ctaText}
          </Button>
        )}
      </div>

      <div className={s.centerStack}>
        <h2 className={s.titleDesktop}>{title}</h2>

        {ctaText && (
          <Button
            as={Link as any}
            href={ctaLink}
            type="link"
            style="ghost"
            size="medium"
            className={s.ctaBtnDesktop}
            trailingIcon={
              <img
                src="/icons/chevron-left-white.svg"
                alt=""
                aria-hidden="true"
              />
            }
            aria-label={ctaText}
          >
            {ctaText}
          </Button>
        )}
      </div>
    </div>
  );
}
