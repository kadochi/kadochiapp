// Server Component
import OccasionCarouselClient from "./OccasionCarousel.client";
import { dayjs, parseOccasionDate, PERSIAN_MONTHS } from "@/lib/jalali";
import getInitialSession from "@/lib/auth/session";
import { wordpressFetch } from "@/services/wordpress";

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

function mapOccasions(
  data: WPOccasion[],
  variant: "public" | "private",
  now = new Date(),
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

  const fetchOpts = { revalidate: 1800 } as const;

  let mapped: OccasionItem[] = [];
  try {
    const path =
      "/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100";

    const res = await wordpressFetch(path, fetchOpts);

    let allData: WPOccasion[] = [];
    if (res.ok) {
      const json = await res.json();
      allData = Array.isArray(json) ? json : [];
    }

    const now = new Date();
    const adminItems = mapOccasions(
      allData.filter((it) => {
        const owner = it.acf?.user_id;
        return owner == null || owner === "" || String(owner) === "1";
      }),
      "public",
      now,
    );

    const userItems = userId
      ? mapOccasions(
          allData.filter((it) => {
            const owner = it.acf?.user_id;
            return String(owner) === String(userId);
          }),
          "private",
          now,
        )
      : [];

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
