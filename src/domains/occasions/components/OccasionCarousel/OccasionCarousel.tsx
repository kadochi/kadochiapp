// Server Component
import OccasionCarouselClient from "./OccasionCarousel.client";
import { dayjs, parseOccasionDate, PERSIAN_MONTHS } from "@/lib/jalali";
import getInitialSession from "@/lib/auth/session";

type OccasionItem = {
  title: string;
  day: string;
  month: string;
  remainingDays: number;
  sortKey: number;
  variant: "public" | "private";
};

type WPOccasion = {
  acf?: {
    title?: string;
    occasion_date?: string;
    user_id?: number | string | null;
  };
};

const WP_BASE = process.env.WP_BASE_URL || "https://app.kadochi.com";

function mapOccasions(
  data: WPOccasion[],
  variant: "public" | "private",
  now = new Date()
): OccasionItem[] {
  return data
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
        variant,
      } as OccasionItem;
    })
    .filter((x): x is OccasionItem => x !== null);
}

export default async function OccasionCarousel() {
  const session = await getInitialSession();
  const userId = session?.userId ?? null;

  const fetchOpts = { next: { revalidate: 1800 } } as const;

  let mapped: OccasionItem[] = [];
  try {
    const adminUrl = `${WP_BASE}/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100`;
    const userUrl = userId
      ? `${WP_BASE}/wp-json/wp/v2/occasion?author=${userId}&acf_format=standard&per_page=100`
      : null;

    const [adminRes, userRes] = await Promise.all([
      fetch(adminUrl, fetchOpts),
      userUrl ? fetch(userUrl, fetchOpts) : Promise.resolve(null),
    ]);

    let adminData: WPOccasion[] = [];
    if (adminRes.ok) {
      const json = await adminRes.json();
      adminData = (Array.isArray(json) ? json : []).filter(
        (it: WPOccasion) => {
          const owner = it.acf?.user_id;
          return owner == null || owner === "" || String(owner) === "1";
        },
      );
    }

    let userData: WPOccasion[] = [];
    if (userRes?.ok) {
      const json = await userRes.json();
      userData = Array.isArray(json) ? json : [];
    }

    const now = new Date();
    const adminItems = mapOccasions(adminData, "public", now);
    const userItems = mapOccasions(userData, "private", now);

    const seen = new Set<string>();
    mapped = [];
    for (const item of adminItems) {
      const dedupeKey = `${item.title}|${item.sortKey}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        mapped.push(item);
      }
    }
    for (const item of userItems) {
      const dedupeKey = `${item.title}|${item.sortKey}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        mapped.push(item);
      }
    }
    mapped.sort((a, b) => a.sortKey - b.sortKey);
  } catch {
    mapped = [];
  }

  return <OccasionCarouselClient items={mapped} userId={userId} />;
}
