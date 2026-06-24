"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button/Button";

export default function AboutSection() {
  return (
    <section
      className={cn(
        "grid gap-4 text-center justify-items-center",
        "px-6 pt-6 pb-2"
      )}
    >
      <h2
        className={cn(
          "font-sans text-heading-24 font-bold leading-heading-24 m-0",
          "bg-gradient-to-l from-[var(--secondary-on-secondary-container)] to-[var(--secondary-secondary-gradient)] bg-clip-text text-transparent"
        )}
      >
        کادوچی؛ خرید کادو
      </h2>

      <p
        className={cn(
          "font-sans text-body-14 font-normal leading-body-14 m-0",
          "text-surface-neutral-mid",
          "max-lg:max-w-[720px]"
        )}
      >
        کادوچی به شما کمک می‌کند ضمن صرفه‌جویی در هزینه حمل‌ونقل و زمان،
        به‌سادگی کادوی مناسب برای فرد موردنظرتان را پیدا کنید. ما کادو را در
        بسته‌بندی زیبا برای کسانی که دوست‌شان دارید ارسال می‌کنیم یا می‌توانید
        هدیه را خودتان تحویل گرفته و تقدیم کنید.
      </p>

      <div className="flex justify-center">
        <Button
          as={Link as any}
          href="/products"
          type="secondary"
          style="filled"
          size="large"
          trailingIcon={
            <img
              src="/icons/chevron-left-white.svg"
              alt=""
              aria-hidden="true"
            />
          }
        >
          خرید کادو
        </Button>
      </div>
    </section>
  );
}
