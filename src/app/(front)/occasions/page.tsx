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

  const fetchOpts = {
    allowProxyFallback: true,
    timeoutMs: 6000,
    revalidate: 1800,
    next: { tags: ["occasions"] as string[], revalidate: 1800 },
  };

  try {
    const adminCall = wordpressJson<WordPressOccasion[]>(
      `/wp-json/wp/v2/occasion?author=1&acf_format=standard&per_page=100`,
      fetchOpts,
    );

    const userCall =
      userId != null
        ? wordpressJson<WordPressOccasion[]>(
            `/wp-json/wp/v2/occasion?author=${userId}&acf_format=standard&per_page=100`,
            fetchOpts,
          )
        : null;

    const [adminResult, userResult] = await Promise.all([
      adminCall,
      userCall ?? Promise.resolve(null),
    ]);

    const adminPayload = Array.isArray(adminResult.data)
      ? adminResult.data
      : [];
    const userPayload = userResult
      ? Array.isArray(userResult.data)
        ? userResult.data
        : []
      : [];

    const m: Record<string, string[]> = {};

    const isAdminOccasion = (it: WordPressOccasion) => {
      const owner = it.acf?.user_id;
      return owner == null || owner === "" || String(owner) === "1";
    };

    adminPayload.forEach((it) => {
      if (!isAdminOccasion(it)) return;
      const d = parseOccasionDate(it.acf?.occasion_date);
      const t = it.acf?.title?.trim();
      if (!d || !t) return;
      (m[d] ||= []).push(t);
    });

    userPayload.forEach((it) => {
      const d = parseOccasionDate(it.acf?.occasion_date);
      const t = it.acf?.title?.trim();
      if (!d || !t) return;
      const existing = m[d] ?? [];
      if (!existing.includes(t)) (m[d] ||= []).push(t);
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
