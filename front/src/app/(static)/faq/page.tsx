import type { Metadata } from "next";
import { Container } from "@/components/layout/container";
import { Accordion } from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "کادوچی | سوالات متداول",
  description: "پاسخ سوالات متداول درباره ثبت سفارش، ارسال هدیه، پرداخت و قوانین کادوچی را بخوانید.",
  alternates: { canonical: "/faq" },
};

const items = [
  { value: "order", title: "چطور سفارش ثبت کنم؟", content: "برای ثبت سفارش کافیست وارد صفحه محصول مورد نظر خود شوید و بر روی اضافه به سبد خرید کلیک کنید. سپس در بالای صفحه بر روی آیکون سبد خرید کلیک کرده و مراحل پرداخت را تکمیل نمایید." },
  { value: "shipping", title: "زمان ارسال چگونه است؟", content: "زمان ارسال با توجه به نوع محصول و منطقه شما متفاوت است. معمولاً سفارش‌ها در همان روز یا روز بعد ارسال می‌شوند. برای اطلاعات دقیق‌تر، لطفاً به صفحه محصول مراجعه کنید." },
  { value: "recipient", title: "آیا می‌توانم سفارش را برای شخص دیگری ارسال کنم؟", content: "بله شما می‌تواند هنگام ثبت سفارش، آدرس و مشخصات گیرنده را وارد کنید تا سفارش مستقیماً برای آن شخص ارسال شود." },
  { value: "cancel", title: "آیا امکان لغو سفارش هست؟", content: "بله، طبق قوانین لغو سفارش که در بخش قوانین آمده است." },
] as const;

export default function FaqPage() {
  return <Container py="xl"><article><h2 className="m-0 font-sans text-heading-24 font-bold leading-[var(--text-heading-24--line-height)] text-surface-neutral-high-emphasis">سوالات متداول</h2><Accordion className="mt-24" items={items} /></article></Container>;
}
