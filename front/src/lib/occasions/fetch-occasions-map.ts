import "server-only";

import { wordpressJson } from "@/services/wordpress";
import { parseOccasionDate } from "@/lib/jalali";
import type { WordPressOccasion } from "@/types/wordpress";
import type { OccasionEntry } from "./types";

export type { OccasionEntry };

const FETCH_OPTS = {
  allowProxyFallback: true,
  timeoutMs: 6000,
  revalidate: 1800,
  next: { tags: ["occasions"] as string[], revalidate: 1800 },
};

function mergePayloads(
  adminPayload: WordPressOccasion[],
  userPayload: WordPressOccasion[],
  userId: number | null,
): Record<string, OccasionEntry[]> {
  const m: Record<string, OccasionEntry[]> = {};

  for (const it of adminPayload) {
    const owner = it.acf?.user_id;
    const isPublic = owner == null || owner === "" || String(owner) === "1";
    if (!isPublic) continue;

    const d = parseOccasionDate(it.acf?.occasion_date);
    const t = it.acf?.title?.trim();
    if (!d || !t) continue;

    (m[d] ||= []).push({ title: t, variant: "public" });
  }

  for (const it of userPayload) {
    const d = parseOccasionDate(it.acf?.occasion_date);
    const t = it.acf?.title?.trim();
    if (!d || !t) continue;

    const existing = m[d] ?? [];
    if (existing.some((e) => e.title === t)) continue;

    (m[d] ||= []).push({ title: t, variant: "private", id: it.id });
  }

  // Also capture any private occasions in the admin payload
  // (created after the author=1 fix where ACF user_id !== "1")
  if (userId != null) {
    for (const it of adminPayload) {
      const owner = it.acf?.user_id;
      const isUserOwned = String(owner) === String(userId);
      if (!isUserOwned) continue;

      const d = parseOccasionDate(it.acf?.occasion_date);
      const t = it.acf?.title?.trim();
      if (!d || !t) continue;

      const existing = m[d] ?? [];
      if (existing.some((e) => e.title === t)) continue;

      (m[d] ||= []).push({ title: t, variant: "private", id: it.id });
    }
  }

  return m;
}

/**
 * Fetches all occasions visible to the given user and returns a Gregorian-keyed map.
 * Always fetches public occasions (author=1). When userId is provided also fetches
 * that user's privately-authored occasions (needed for posts created before the
 * author=1 normalization fix).
 */
export async function fetchOccasionsMap(
  userId: number | null,
): Promise<Record<string, OccasionEntry[]>> {
  const adminCall = wordpressJson<WordPressOccasion[]>(
    `/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100`,
    FETCH_OPTS,
  );

  const userCall =
    userId != null
      ? wordpressJson<WordPressOccasion[]>(
          `/wp-json/wp/v2/occasion?author=${userId}&acf_format=standard&per_page=100`,
          FETCH_OPTS,
        )
      : null;

  const [adminResult, userResult] = await Promise.all([
    adminCall,
    userCall ?? Promise.resolve(null),
  ]);

  const adminPayload = Array.isArray(adminResult.data) ? adminResult.data : [];
  const userPayload =
    userResult != null && Array.isArray(userResult.data)
      ? userResult.data
      : [];

  return mergePayloads(adminPayload, userPayload, userId);
}
