import type { Metadata } from "next";

import { ProfileOrdersPage } from "@/features/profile/components/profile-orders-page";

export const metadata: Metadata = {
  title: "کادوچی | سفارش‌های من",
  description: "فهرست سفارش‌های جاری، تحویل‌شده و لغوشده شما در کادوچی.",
};

export default function Page() {
  return <ProfileOrdersPage />;
}
