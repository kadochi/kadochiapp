import type { Metadata } from "next";

import { ProfileCompletionPage } from "@/features/profile/components/profile-completion-page";

export const metadata: Metadata = {
  title: "کادوچی | تکمیل پروفایل",
  description: "ماموریت‌های تکمیل اطلاعات حساب کاربری در کادوچی.",
};

export default function Page() {
  return <ProfileCompletionPage />;
}
