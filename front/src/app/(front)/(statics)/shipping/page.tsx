import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "کادوچی | ارسال و تحویل",
  description:
    "شرایط ارسال و تحویل سفارش‌ها در کادوچی؛ زمان‌بندی ارسال، مناطق تحت پوشش و نکات مهم درباره تحویل هدیه.",
  alternates: {
    canonical: "/shipping",
  },
  openGraph: {
    title: "کادوچی | ارسال و تحویل",
    description:
      "اطلاعات ارسال سفارش در کادوچی؛ زمان تحویل، مناطق ارسال و راهنمای دریافت هدیه.",
    url: "/shipping",
  },
  twitter: {
    title: "کادوچی | ارسال و تحویل",
    description:
      "راهنمای ارسال و تحویل هدیه در کادوچی؛ زمان‌بندی و شرایط تحویل سفارش.",
  },
};

export default async function TempPage() {
  return <div></div>;
}
