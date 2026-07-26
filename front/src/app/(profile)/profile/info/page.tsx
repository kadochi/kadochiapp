import type { Metadata } from "next";

import { ProfileInfoPage } from "@/features/profile/components/profile-info-page";

export const metadata: Metadata = {
  title: "کادوچی | اطلاعات حساب کاربری",
  description: "مشاهده و ویرایش اطلاعات حساب کاربری شما در کادوچی.",
};

export default function Page() {
  return <ProfileInfoPage />;
}
