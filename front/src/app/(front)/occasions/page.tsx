import type { Metadata } from "next";
import OccasionsClient, { type OccasionEntry } from "./OccasionsClient";
import getInitialSession, { type Session } from "@/lib/auth/session";
import { wordpressJson } from "@/services/wordpress";
import type { WordPressOccasion } from "@/types/wordpress";
import { parseOccasionDate } from "@/lib/jalali";

export const metadata: Metadata = {
  title: "تقویم مناسبت‌ها",
  description: "نمایش مناسبت‌های رسمی و شخصی پیش‌رو در تقویم.",
  alternates: { canonical: "/occasions" },
};

export default async function OccasionsPage() {
  const session: Session | null = await getInitialSession();
  const userId = session?.userId ?? null;
  const isLoggedIn = !!userId;

  let map: Record<string, OccasionEntry[]> = {};

  const fetchOpts = {
    allowProxyFallback: true,
    timeoutMs: 6000,
    revalidate: 1800,
    next: { tags: ["occasions"] as string[], revalidate: 1800 },
  };

  try {
    const result = await wordpressJson<WordPressOccasion[]>(
      `/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100`,
      fetchOpts,
    );

    const payload = Array.isArray(result.data) ? result.data : [];

    const m: Record<string, OccasionEntry[]> = {};

    payload.forEach((it) => {
      const owner = it.acf?.user_id;
      const isPublic = owner == null || owner === "" || String(owner) === "1";
      const isUserOwned = userId != null && String(owner) === String(userId);

      if (!isPublic && !isUserOwned) return;

      const d = parseOccasionDate(it.acf?.occasion_date);
      const t = it.acf?.title?.trim();
      if (!d || !t) return;

      const existing = m[d] ?? [];
      if (isUserOwned && existing.some((e) => e.title === t)) return;

      (m[d] ||= []).push({
        title: t,
        variant: isPublic ? "public" : "private",
        id: isUserOwned ? it.id : undefined,
      });
    });

    map = m;
  } catch {
    map = {};
  }

  return (
    <OccasionsClient
      initialMap={map}
      isLoggedInInitial={isLoggedIn}
      signinHref="/login?redirect=/occasions"
    />
  );
}
