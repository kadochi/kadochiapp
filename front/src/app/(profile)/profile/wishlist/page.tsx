import type { Metadata } from "next";

import { ProfileProductActionsPage } from "@/features/profile/components/profile-product-actions-page";

export const metadata: Metadata = {
  title: "کادوچی | لیست آرزوها",
  description: "محصول‌های ذخیره‌شده شما در کادوچی.",
};

export default function Page() {
  return <ProfileProductActionsPage action="save" />;
}
