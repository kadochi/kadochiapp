import type { Metadata } from "next";

import { OccasionsPage } from "@/features/occasions/components/occasions-page";

export const metadata: Metadata = {
  title: "کادوچی | تقویم مناسبت‌ها",
  description: "مناسبت‌های شخصی خود را در تقویم کادوچی ثبت و پیگیری کنید.",
  robots: { index: false, follow: false },
  alternates: { canonical: "/occasions" },
};

export default function Page() {
  return <OccasionsPage />;
}
