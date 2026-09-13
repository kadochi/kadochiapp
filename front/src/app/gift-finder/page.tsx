import type { Metadata } from "next";

import LayoutContent from "@/components/layout/layout-content";
import { GiftFinderRoute } from "@/features/gift-finder/components/gift-finder-route";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "کادوچی | کادو چی بخرم؟",
  description: "با چند انتخاب ساده، کادوی مناسب برای شخص و مناسبت موردنظرتان را پیدا کنید.",
  alternates: { canonical: "/gift-finder" },
};

export default function GiftFinderPage() {
  return (
    <LayoutContent showFooter={false}>
      <GiftFinderRoute dismissMode="home" />
    </LayoutContent>
  );
}
