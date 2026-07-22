import type { Metadata } from "next";

import { ProfileProductActionsPage } from "@/features/profile/components/profile-product-actions-page";

export const metadata: Metadata = {
  title: "مورد علاقه‌ها | کادوچی",
  description: "محصول‌های مورد علاقه شما در کادوچی.",
};

export default function Page() {
  return <ProfileProductActionsPage action="like" />;
}
