import type { Metadata } from "next";

import { ProfileAddressesPage } from "@/features/profile/components/profile-addresses-page";

export const metadata: Metadata = {
  title: "آدرس‌ها | کادوچی",
  description: "مشاهده و مدیریت آدرس‌های دریافت سفارش شما در کادوچی.",
};

export default function Page() {
  return <ProfileAddressesPage />;
}
