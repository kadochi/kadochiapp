import type { Metadata } from "next";
import OccasionsClient from "./OccasionsClient";
import getInitialSession, { type Session } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "تقویم مناسبت‌ها",
  description: "نمایش مناسبت‌های رسمی و شخصی پیش‌رو در تقویم.",
  alternates: { canonical: "/occasions" },
};

type WPOccasion = {
  acf?: {
    title?: string;
    occasion_date?: string;
    repeat_yearly?: boolean;
    user_id?: number | string | null;
  };
};

export default async function OccasionsPage() {
  const WP_BASE = process.env.WP_BASE_URL || "https://app.kadochi.com";
  const session: Session | null = await getInitialSession();
  const userId = session?.userId ?? null;
  const isLoggedIn = !!userId;

  let map: Record<string, string[]> = {};

  try {
    const res = await fetch(
      `${WP_BASE}/wp-json/wp/v2/occasion?acf_format=standard&per_page=100`,
      { next: { revalidate: 1800 } }
    );

    if (res.ok) {
      const json = (await res.json()) as unknown as WPOccasion[];

      const m: Record<string, string[]> = {};
      json.forEach((it) => {
        const d = it.acf?.occasion_date?.trim();
        const t = it.acf?.title?.trim();
        const owner = it.acf?.user_id ?? null;

        // فقط عمومی‌ها یا مناسبت‌های همین کاربر
        const isPublic =
          owner === null || owner === "" || typeof owner === "undefined";
        const isMine = userId != null && String(owner) === String(userId);

        if (!d || !t) return;
        if (!(isPublic || isMine)) return;

        (m[d] ||= []).push(t);
      });

      map = m;
    }
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
