import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "کادوچی | روش ارسال",
  description: "اطلاعات روش و زمان ارسال سفارش‌های کادوچی را پیش از ثبت سفارش بررسی کنید.",
  alternates: { canonical: "/shipping" },
};

export default function ShippingPage() {
  return (
    <Container asChild py="xl">
      <article className="font-sans text-surface-neutral-mid-emphasis">
        <h2 className="m-0 text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis">روش ارسال</h2>
        <p className="mt-24 mb-0 text-body-16 font-regular leading-[var(--text-body-16--line-height)]">زمان و هزینه ارسال با توجه به نوع محصول، زمان آماده‌سازی و منطقه دریافت سفارش تعیین می‌شود. هنگام ثبت سفارش، گزینه‌های قابل‌دسترس و زمان تقریبی تحویل به شما نمایش داده خواهد شد.</p>
      </article>
    </Container>
  );
}
