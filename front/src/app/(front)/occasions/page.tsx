import type { Metadata } from "next";
import OccasionsClient from "./OccasionsClient";
import { getInitialSession } from "@/modules/auth/services/session";
import type { Session } from "@/modules/auth/types";
import { fetchOccasionsMap } from "@/modules/occasions/services/occasions";
import type { OccasionEntry } from "@/modules/occasions/types";

export const metadata: Metadata = {
  title: "تقویم مناسبت‌ها",
  description: "نمایش مناسبت‌های رسمی و شخصی پیش‌رو در تقویم.",
  alternates: { canonical: "/occasions" },
};

export { type OccasionEntry };

export default async function OccasionsPage() {
  const session: Session | null = await getInitialSession();
  const userId = session?.userId ?? null;
  const isLoggedIn = !!userId;

  let map: Record<string, OccasionEntry[]> = {};
  try {
    map = await fetchOccasionsMap(userId);
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
