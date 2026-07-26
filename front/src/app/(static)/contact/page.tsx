import type { Metadata } from "next";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "کادوچی | تماس با ما",
  description: "راه‌های تماس با پشتیبانی کادوچی، شامل شماره تلفن، ایمیل و نشانی دفتر را مشاهده کنید.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Container asChild py="xl">
      <article className="font-sans text-surface-neutral-mid-emphasis">
        <h2 className="m-0 text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis">تماس با ما</h2>
        <div className="mt-24 grid gap-24 text-body-16 font-regular leading-[var(--text-body-16--line-height)]">
          <section><h3 className="m-0 text-title-16 font-bold text-surface-neutral-high-emphasis">شماره تماس</h3><p className="mt-8 mb-0">۰۲۱ ۸۸۴۵۵۵۵۴</p></section>
          <section><h3 className="m-0 text-title-16 font-bold text-surface-neutral-high-emphasis">ایمیل</h3><p className="mt-8 mb-0">info@kadochi.com</p></section>
          <section><h3 className="m-0 text-title-16 font-bold text-surface-neutral-high-emphasis">آدرس</h3><p className="mt-8 mb-0">تهران، خیابان شریعتی، کوچه استاد مینوی، پلاک ۱۸</p></section>
        </div>
      </article>
    </Container>
  );
}
