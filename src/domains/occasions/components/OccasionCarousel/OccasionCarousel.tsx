// Server Component
import OccasionCarouselClient from "./OccasionCarousel.client";
import { dayjs, parseOccasionDate, PERSIAN_MONTHS } from "@/lib/jalali";

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

  return arr
    .map((item) => {
      const acf = item.acf ?? {};
      const title = (acf.title ?? "").trim();
      const gregorianDateStr = parseOccasionDate(acf.occasion_date);
      if (!gregorianDateStr) return null;

      const targetDate = dayjs(gregorianDateStr).toDate();
      const diffTime = targetDate.getTime() - now.getTime();
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (remainingDays < 0) return null;

      const j = dayjs(gregorianDateStr).calendar("jalali");

      return {
        title,
        day: String(j.date()),
        month: PERSIAN_MONTHS[j.month() + 1],
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
