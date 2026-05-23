// app/not-found.tsx  (Server Component)
import type { Metadata } from "next";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import Header from "@/components/layout/Header/Header";
import Button from "@/components/ui/Button/Button";

export const metadata: Metadata = {
  title: "خطای ۴۰۴ — صفحه پیدا نشد | کادوچی",
  description: "متاسفانه صفحه مورد نظر پیدا نشد.",
  openGraph: {
    title: "خطای ۴۰۴ — صفحه پیدا نشد | کادوچی",
    description: "متاسفانه صفحه مورد نظر پیدا نشد.",
    url: "/404",
    siteName: "Kadochi",
    images: [{ url: "/images/og-404.png" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "خطای ۴۰۴ — صفحه پیدا نشد | کادوچی",
    description: "متاسفانه صفحه مورد نظر پیدا نشد.",
    images: ["/images/og-404.png"],
  },
};

export default function NotFound() {
  return (
    <main className="page" dir="rtl">
      <Header />
      <div className="layoutContainer">
        <StateMessage
          imageSrc="/images/illustration-404.png"
          imageAlt="صفحه پیدا نشد"
          title="خطای ۴۰۴"
          subtitle="متاسفانه صفحه مورد نظر پیدا نشد."
          actions={
            <Button
              as="a"
              href="/"
              type="tertiary"
              style="outline"
              size="medium"
              aria-label="برگشت به صفحه اصلی"
            >
              برگرد به صفحه اصلی
            </Button>
          }
        />
      </div>
    </main>
  );
}
