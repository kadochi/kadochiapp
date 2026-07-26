import type { Metadata } from "next";

import { ProfileProductActionsPage } from "@/features/profile/components/profile-product-actions-page";

export const metadata: Metadata = {
  title: "کادوچی | مورد علاقه‌ها",
  description: "محصول‌های مورد علاقه شما در کادوچی.",
};

export default function Page() {
  return <ProfileProductActionsPage action="like" />;
}
