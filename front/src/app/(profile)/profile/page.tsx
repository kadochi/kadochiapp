import type { Metadata } from "next";

import LayoutContent from "@/components/layout/layout-content";
import ProfilePage from "@/features/profile/components/profile-page";

export const metadata: Metadata = {
  title: "حساب کاربری | کادوچی",
  description: "مدیریت اطلاعات حساب کاربری و سفارش‌های شما در کادوچی.",
};

export default function Page() {
  return <LayoutContent mainClassName="bg-surface-background" showBottomNav><ProfilePage /></LayoutContent>;
}
