"use client";

import Link from "next/link";
import Button from "@/components/ui/Button/Button";
import s from "./AboutSection.module.css";

export default function AboutSection() {
  return (
    <section className={s.section}>
      <h2 className={`${s.title} ${s.titleGradient}`}>کادوچی؛ خرید کادو</h2>

      <p className={s.paragraph}>
        کادوچی به شما کمک می‌کند ضمن صرفه‌جویی در هزینه حمل‌ونقل و زمان،
        به‌سادگی کادوی مناسب برای فرد موردنظرتان را پیدا کنید. ما کادو را در
        بسته‌بندی زیبا برای کسانی که دوست‌شان دارید ارسال می‌کنیم یا می‌توانید
        هدیه را خودتان تحویل گرفته و تقدیم کنید.
      </p>

      <div className={s.ctaRow}>
        <Button
          as={Link as any}
          href="/products"
          type="secondary"
          style="filled"
          size="large"
          aria-label="خرید کادو"
          trailingIcon={
            <img src="/icons/chevron-left-white.svg" alt="chevron left" />
          }
        >
          خرید کادو
        </Button>
      </div>
    </section>
  );
}
