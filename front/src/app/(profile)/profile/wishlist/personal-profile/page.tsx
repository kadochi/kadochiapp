import type { Metadata } from "next";

import PersonalProfileSettingsPage from "@/features/profile/components/personal-profile-settings-page";

export const metadata: Metadata = {
  title: "کادوچی | تنظیمات پروفایل شخصی",
  description: "مدیریت صفحه عمومی و لیست آرزوهای شما در کادوچی.",
};

export default function Page() {
  return <PersonalProfileSettingsPage />;
}
