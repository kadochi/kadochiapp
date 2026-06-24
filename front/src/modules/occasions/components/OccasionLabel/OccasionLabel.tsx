"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

export type OccasionItem = {
  label: string;
  value: string;
  link: string;
};

type Props = {
  items?: OccasionItem[];
  className?: string;
};

const DEFAULT_ITEMS: OccasionItem[] = [
  {
    label: "ارسال کادو برای",
    value: "ابراز علاقه",
    link: "/products?tag=sendlove",
  },
  {
    label: "ارسال کادو به نشانه",
    value: "قدردانی",
    link: "/products?tag=appreciation",
  },
  {
    label: "ارسال کادو برای عرض",
    value: "عذرخواهی",
    link: "/products?tag=apology",
  },
  {
    label: "ارسال کادو فقط بخاطر",
    value: "یک لبخند",
    link: "/products?tag=makesmile",
  },
  {
    label: "ارسال کادو جهت",
    value: "آرزوی سلامتی",
    link: "/products?tag=wishinghealth",
  },
  {
    label: "ارسال کادو برای",
    value: "یاد کردن",
    link: "/products?tag=toremember",
  },
];

export default function OccasionLabel({
  items = DEFAULT_ITEMS,
  className,
}: Props) {
  return (
    <div className={cn("overflow-x-auto rtl px-4 pb-4", className)}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((it, idx) => (
          <div key={`${it.link}-${idx}`} className="w-full flex-shrink-0">
            <Link
              href={it.link}
              className="flex flex-col items-center text-center py-8 w-full bg-[var(--secondary-secondary-container)] rounded-xl no-underline"
              prefetch={false}
            >
              <span className="text-[var(--fs-label-12)] leading-[var(--lh-label-12)] text-[var(--secondary-secondary)]">
                {it.label}
              </span>
              <span className="mt-1 text-[var(--fs-title-18)] leading-[var(--lh-title-18)] font-extrabold text-[var(--secondary-secondary)]">
                {it.value}
              </span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
