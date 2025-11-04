// Server Component
import OccasionCarouselClient from "./OccasionCarousel.client";
import { toJalaali } from "jalaali-js";

type OccasionItem = {
  title: string;
  day: string;
  month: string;
  remainingDays: number;
  sortKey: number;
};

type WPOccasion = {
  acf?: {
    title?: string;
    occasion_date?: string;
  };
};

const WP_BASE = process.env.WP_BASE_URL || "https://app.kadochi.com";

function mapOccasions(data: unknown, now = new Date()): OccasionItem[] {
  const arr = Array.isArray(data) ? (data as WPOccasion[]) : [];
  const persianMonths = [
    "",
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ] as const;

  return arr
    .map((item) => {
      const acf = item.acf ?? {};
      const title = (acf.title ?? "").trim();
      const gregorianDateStr = (acf.occasion_date ?? "").trim();
      if (!gregorianDateStr) return null;

      const [gy, gm, gd] = gregorianDateStr.split("-").map(Number);
      if (!gy || !gm || !gd) return null;

      const targetDate = new Date(gy, gm - 1, gd);
      const diffTime = targetDate.getTime() - now.getTime();
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (remainingDays < 0) return null;

      const j = toJalaali(gy, gm, gd);

      return {
        title,
        day: String(j.jd),
        month: persianMonths[j.jm],
        remainingDays,
        sortKey: targetDate.getTime(),
      } as OccasionItem;
    })
    .filter((x): x is OccasionItem => x !== null)
    .sort((a, b) => a.sortKey - b.sortKey);
}

export default async function OccasionCarousel() {
  const url = `${WP_BASE}/wp-json/wp/v2/occasion?acf_format=standard`;

  let mapped: OccasionItem[] = [];
  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    if (res.ok) {
      const json = await res.json();
      mapped = mapOccasions(json);
    }
  } catch {
    mapped = [];
  }

  return <OccasionCarouselClient items={mapped} />;
}
