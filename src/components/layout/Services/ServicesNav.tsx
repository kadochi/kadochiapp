"use client";

import Link from "next/link";
import s from "./ServicesNav.module.css";

export type ServiceItem = {
  label: string;
  href: string;
  icon: string;
  variant?: "wide" | "sq";
};

export default function ServicesNav({
  items,
  className,
}: {
  items: ServiceItem[];
  className?: string;
}) {
  return (
    <section className={`${s.wrap} ${className ?? ""}`} dir="rtl">
      <div className={s.inner}>
        {items.map((it, i) => (
          <Link
            key={`${it.href}-${i}`}
            href={it.href}
            prefetch={false}
            className={`${s.item} ${it.variant === "wide" ? s.wide : ""}`}
          >
            <span className={s.iconBox} aria-hidden>
              <img src={it.icon} alt="" className={s.icon} />
            </span>
            <span className={s.label}>{it.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* --- نمونه استفاده ---
<ServicesNav
  items={[
    { label: "گل", href: "/flowers", icon: "/icons/flower.svg", variant: "sq" },
    { label: "کادو", href: "/gifts", icon: "/icons/gift.svg", variant: "sq" },
    { label: "کیک", href: "/cakes", icon: "/icons/cake.svg", variant: "sq" },
    { label: "شمع", href: "/candles", icon: "/icons/candle.svg", variant: "sq" },
    { label: "ارسال فوری", href: "/express", icon: "/icons/flash.svg", variant: "wide" },
    { label: "سفارشی‌سازی", href: "/custom", icon: "/icons/edit.svg", variant: "wide" },
  ]}
/>
*/
