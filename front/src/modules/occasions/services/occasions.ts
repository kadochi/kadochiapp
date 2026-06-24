import "server-only";

import { wordpressJson } from "@/services/wordpress";
import { parseOccasionDate } from "@/lib/jalali";
import { occasionListResponseSchema } from "../schema";
import type { OccasionEntry } from "../types";

const FETCH_OPTS = {
  allowProxyFallback: true,
  timeoutMs: 6000,
  revalidate: 1800,
  next: { tags: ["occasions"] as string[], revalidate: 1800 },
};

function mergePayloads(
  adminPayload: OccasionPayload,
  userPayload: OccasionPayload,
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

type OccasionPayload = ReturnType<typeof parseList>;

function parseList(raw: unknown) {
  return occasionListResponseSchema.parse(raw);
}

export async function fetchOccasionsMap(
  userId: number | null,
): Promise<Record<string, OccasionEntry[]>> {
  const adminCall = wordpressJson<OccasionPayload>(
    `/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100`,
    { ...FETCH_OPTS, schema: { parse: parseList } },
  );

  const userCall =
    userId != null
      ? wordpressJson<OccasionPayload>(
          `/wp-json/wp/v2/occasion?author=${userId}&acf_format=standard&per_page=100`,
          { ...FETCH_OPTS, schema: { parse: parseList } },
        )
      : null;

  const [adminResult, userResult] = await Promise.all([
    adminCall,
    userCall ?? Promise.resolve(null),
  ]);

  const adminPayload = adminResult?.data ?? [];
  const userPayload = userResult?.data ?? [];

  return mergePayloads(adminPayload, userPayload, userId);
}
