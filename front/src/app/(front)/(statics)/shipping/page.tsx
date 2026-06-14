import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ارسال و تحویل",
  description:
    "شرایط ارسال و تحویل سفارش‌ها در کادوچی؛ زمان‌بندی ارسال، مناطق تحت پوشش و نکات مهم درباره تحویل هدیه.",
  alternates: {
    canonical: "/shipping",
  },
  openGraph: {
    title: "ارسال و تحویل | کادوچی",
    description:
      "اطلاعات ارسال سفارش در کادوچی؛ زمان تحویل، مناطق ارسال و راهنمای دریافت هدیه.",
    url: "/shipping",
  },
  twitter: {
    title: "ارسال و تحویل | کادوچی",
    description:
      "راهنمای ارسال و تحویل هدیه در کادوچی؛ زمان‌بندی و شرایط تحویل سفارش.",
  },
};

export default async function TempPage() {
  return <div></div>;
}
