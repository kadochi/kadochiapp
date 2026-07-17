import type { Metadata } from "next";
import Link from "next/link";

import LayoutContent from "@/components/layout/layout-content";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "خطای ۴۰۴ — صفحه پیدا نشد | کادوچی",
  description: "متاسفانه صفحه مورد نظر پیدا نشد.",
  openGraph: {
    title: "خطای ۴۰۴ — صفحه پیدا نشد | کادوچی",
    description: "متاسفانه صفحه مورد نظر پیدا نشد.",
    url: "/404",
    siteName: "Kadochi",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "خطای ۴۰۴ — صفحه پیدا نشد | کادوچی",
    description: "متاسفانه صفحه مورد نظر پیدا نشد.",
  },
};

export default function NotFound() {
  return (
    <LayoutContent mainClassName="flex">
      <StateMessage
        className="my-auto w-full"
        imageAlt="صفحه پیدا نشد"
        imageSrc="/images/illustration-404.png"
        subtitle="متاسفانه صفحه مورد نظر پیدا نشد."
        title="خطای ۴۰۴"
        actions={
          <Button asChild size="medium" variant="tertiary-outline">
            <Link aria-label="برگشت به صفحه اصلی" href="/">برگرد به صفحه اصلی</Link>
          </Button>
        }
      />
    </LayoutContent>
  );
}
