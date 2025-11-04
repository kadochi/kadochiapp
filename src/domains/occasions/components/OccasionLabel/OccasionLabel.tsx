"use client";

import Link from "next/link";
import s from "./OccasionLabel.module.css";

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
    <div className={`${s.wrapper} ${className ?? ""}`}>
      <div className={s.grid}>
        {items.map((it, idx) => (
          <div key={`${it.link}-${idx}`} className={s.cell}>
            <Link href={it.link} className={s.card} prefetch={false}>
              <span className={s.label}>{it.label}</span>
              <span className={s.value}>{it.value}</span>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
