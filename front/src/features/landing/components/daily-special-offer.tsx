"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { usePrice } from "@/features/products/hooks/usePrice";
import type { Product } from "@/features/products/types";
import { cn } from "@/lib/utils";

const TEHRAN_TIME_ZONE = "Asia/Tehran";
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TEHRAN_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
const persianNumber = new Intl.NumberFormat("fa-IR", {
  minimumIntegerDigits: 2,
  useGrouping: false,
});

function secondsUntilTehranMidnight(now = new Date()) {
  const parts = formatter.formatToParts(now);
  const time = Object.fromEntries(parts
    .filter((part) => part.type !== "literal")
    .map((part) => [part.type, Number(part.value)]));
  const elapsed = (time.hour * 3600) + (time.minute * 60) + time.second;
  return 86_400 - elapsed;
}

function DailyCountdown() {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setSeconds(secondsUntilTehranMidnight());
    update();
    const interval = window.setInterval(update, 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const units = [
    { label: "ساعت", value: seconds === null ? null : Math.floor(seconds / 3600) },
    { label: "دقیقه", value: seconds === null ? null : Math.floor((seconds % 3600) / 60) },
    { label: "ثانیه", value: seconds === null ? null : seconds % 60 },
  ];

  return (
    <div className="flex items-start justify-between gap-6 [font-variant-numeric:tabular-nums]" role="timer" aria-label="زمان باقی‌مانده تا پایان امروز به وقت تهران" aria-live="off" dir="ltr">
      {units.map(({ label, value }) => (
        <span className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center" key={label}>
          <span className="text-heading-18 leading-[var(--text-heading-18--line-height)] text-on-primary">{value === null ? "––" : persianNumber.format(value)}</span>
          <span className="text-label-10 leading-[var(--text-label-10--line-height)] text-on-primary">{label}</span>
        </span>
      ))}
    </div>
  );
}

/** Product selected in wp-admin and intentionally retained as the offer every day. */
export function DailySpecialOffer({ className, product }: Readonly<{ className?: string; product: Product }>) {
  const image = product.images[0];
  const { current, previous, offPercent, hasDiscount } = usePrice(product);
  const formatPrice = (amount: number) => new Intl.NumberFormat("fa-IR").format(Math.max(0, Math.floor(amount)));

  return (
    <Link
      aria-label={`مشاهده پیشنهاد ویژه روز: ${product.name}`}
      className={cn("relative block aspect-square w-full min-w-0 overflow-hidden rounded-xl bg-secondary-container text-on-primary shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-on-primary)_24%,transparent)] no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary", className)}
      data-component="daily-special-offer"
      dir="rtl"
      href={`/product/${product.slug}`}
      prefetch={false}
    >
      {image ? (
        <Image
          alt={image.alt || product.name}
          className="object-cover"
          fill
          sizes="(min-width: 860px) 25vw, calc(100vw - 24px)"
          src={image.url}
        />
      ) : null}
      <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,color-mix(in_oklab,var(--color-on-secondary-container)_94%,transparent)_0%,color-mix(in_oklab,var(--color-on-secondary-container)_68%,transparent)_34%,transparent_76%)]" />

      <div className="absolute inset-x-32 bottom-32 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-end gap-16" dir="rtl">
        <div className="min-w-0">
          <h2 className="m-0 mb-8 line-clamp-2 text-heading-18 font-bold leading-[var(--text-heading-18--line-height)] text-on-primary" title={product.name}>{product.name}</h2>
          <div className="grid gap-4">
            <div className="inline-flex items-baseline gap-4 text-label-12 leading-[var(--text-label-12--line-height)] text-on-primary">
              <span className="sr-only">قیمت فعلی</span>
              <strong className="text-label-14 font-bold leading-[var(--text-label-14--line-height)]">{formatPrice(current)}</strong>
              <span>تومان</span>
            </div>
            {hasDiscount && previous !== null ? (
              <div className="inline-flex items-center gap-6 text-label-10 leading-[var(--text-label-10--line-height)] text-on-primary">
                <span className="sr-only">قیمت قبل از تخفیف</span>
                <s className="opacity-75">{formatPrice(previous)}</s>
                <Label appearance="solid" className="!h-20 !px-6 !text-label-10" size="sm" variant="danger" aria-label={`تخفیف ${offPercent} درصد`}>
                  {offPercent?.toLocaleString("fa-IR")}٪
                </Label>
              </div>
            ) : null}
          </div>
        </div>
        <div className="grid min-w-0 gap-12">
          <div className="flex flex-wrap items-center justify-between gap-4 text-label-12 leading-[var(--text-label-12--line-height)] text-on-primary">
            <span>پیشنهاد ویژه روز</span>
            <Label
              appearance="solid"
              className="!h-20 !px-6 !text-label-10"
              leadingIcon={<Image alt="" height={12} src="/icons/fast-delivery.svg" width={12} />}
              size="sm"
              variant="success"
            >
              آماده ارسال
            </Label>
          </div>
          <DailyCountdown />
        </div>
      </div>
    </Link>
  );
}
