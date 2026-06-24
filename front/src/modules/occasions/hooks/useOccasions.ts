"use client";

import { useQuery } from "@tanstack/react-query";
import { dayjs, parseOccasionDate, PERSIAN_MONTHS } from "@/lib/jalali";
import type { OccasionItem } from "../types";

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
  today: Date,
): OccasionItem[] {
  return data
    .map((item) => {
      const acf = item.acf ?? {};
      const title = (acf.title ?? "").trim();
      const gregorianDateStr = parseOccasionDate(acf.occasion_date);
      if (!gregorianDateStr) return null;

      const targetDate = dayjs(gregorianDateStr).toDate();
      const diffTime = targetDate.getTime() - today.getTime();
      const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (remainingDays < 0) return null;

      const j = dayjs(gregorianDateStr).calendar("jalali");
      return {
        title,
        day: String(j.date()),
        month: PERSIAN_MONTHS[j.month() + 1] as string,
        remainingDays,
        sortKey: targetDate.getTime(),
        variant,
      };
    })
    .filter((x): x is OccasionItem => x !== null);
}

function dedupeAndSort(items: OccasionItem[]): OccasionItem[] {
  const seen = new Set<string>();
  const result: OccasionItem[] = [];
  for (const item of items) {
    const key = `${item.title}|${item.sortKey}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  result.sort((a, b) => a.sortKey - b.sortKey);
  return result;
}

export function useOccasionsQuery(userId?: number | null) {
  return useQuery({
    queryKey: ["occasions", "carousel", userId],
    queryFn: async () => {
      const today = new Date();

      const adminUrl =
        `/api/wp/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100`;
      const userUrl = userId
        ? `/api/wp/wp-json/wp/v2/occasion?author=${userId}&acf_format=standard&per_page=100`
        : null;

      const [adminData, userData] = await Promise.all([
        fetch(adminUrl, { cache: "no-store" }).then((r) =>
          r.ok ? r.json() : [],
        ),
        userUrl
          ? fetch(userUrl, { cache: "no-store" }).then((r) =>
              r.ok ? r.json() : [],
            )
          : Promise.resolve([]),
      ]);

      const adminArr = Array.isArray(adminData) ? (adminData as WPOccasion[]) : [];
      const userArr = Array.isArray(userData) ? (userData as WPOccasion[]) : [];

      const filteredAdmin = adminArr.filter((it) => {
        const owner = it.acf?.user_id;
        return owner == null || owner === "" || String(owner) === "1";
      });

      const adminItems = mapOccasions(filteredAdmin, "public", today);
      const adminPrivateItems = userId
        ? mapOccasions(
            adminArr.filter((it) => {
              const owner = it.acf?.user_id;
              return String(owner) === String(userId);
            }),
            "private",
            today,
          )
        : [];
      const userItems = mapOccasions(userArr, "private", today);

      return dedupeAndSort([...adminItems, ...adminPrivateItems, ...userItems]);
    },
    staleTime: 5 * 60 * 1000,
    enabled: typeof window !== "undefined",
  });
}
