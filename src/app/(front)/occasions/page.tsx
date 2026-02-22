import type { Metadata } from "next";
import OccasionsClient from "./OccasionsClient";
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

  let map: Record<string, string[]> = {};

  try {
    const result = await wordpressJson<WordPressOccasion[]>(
      `/wp-json/wp/v2/occasion?acf_format=standard&per_page=100`,
      {
        allowProxyFallback: true,
        timeoutMs: 6000,
        revalidate: 1800,
        next: { tags: ["occasions"], revalidate: 1800 },
      },
    );

    const payload = Array.isArray(result.data) ? result.data : [];

    const m: Record<string, string[]> = {};
    payload.forEach((it) => {
      const d = parseOccasionDate(it.acf?.occasion_date);
      const t = it.acf?.title?.trim();
      const owner = it.acf?.user_id ?? null;

      const isPublic =
        owner === null || owner === "" || typeof owner === "undefined";
      const isMine = userId != null && String(owner) === String(userId);

      if (!d || !t) return;
      if (!(isPublic || isMine)) return;

      (m[d] ||= []).push(t);
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
