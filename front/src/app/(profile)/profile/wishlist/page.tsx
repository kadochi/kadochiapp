import type { Metadata } from "next";

import { ProfileProductActionsPage } from "@/features/profile/components/profile-product-actions-page";

export const metadata: Metadata = {
  title: "لیست آرزوها | کادوچی",
  description: "محصول‌های ذخیره‌شده شما در کادوچی.",
};

export default function Page() {
  return <ProfileProductActionsPage action="save" />;
}
