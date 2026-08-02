import type { Metadata } from "next";

import { ProfileNotificationsPage } from "@/features/profile/components/profile-notifications-page";

export const metadata: Metadata = {
  title: "کادوچی | اعلان‌ها",
  description: "پیام‌ها و به‌روزرسانی‌های حساب کادوچی شما.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ProfileNotificationsPage />;
}
