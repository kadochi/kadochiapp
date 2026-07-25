import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import SectionHeader from "@/components/layout/section-header";
import { Button } from "@/components/ui/button";
import { MagazineSlider } from "@/features/magazine/components/magazine-slider";
import type { MagazineArticle } from "@/features/magazine/types";

export function MagazineRail({ articles }: Readonly<{ articles: readonly MagazineArticle[] }>) {
  if (!articles.length) return null;

  return (
    <section aria-labelledby="magazine-home-heading">
      <SectionHeader
        as="h2"
        leftSlot={
          <Button asChild className="text-secondary" size="small" variant="link-ghost">
            <Link aria-label="مشاهده همه مقاله‌های مجله" href="/magazine">
              مشاهده همه
              <ChevronLeft aria-hidden />
            </Link>
          </Button>
        }
        subtitle="راهنمای ساخت لحظه‌های به یاد ماندنی"
        title={<span id="magazine-home-heading">مجله</span>}
      />
      <MagazineSlider articles={articles.slice(0, 4)} />
    </section>
  );
}
