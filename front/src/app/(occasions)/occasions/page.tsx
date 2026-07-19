import type { Metadata } from "next";

import { OccasionsPage } from "@/features/occasions/components/occasions-page";

export const metadata: Metadata = {
  title: "تقویم مناسبت‌ها | کادوچی",
  description: "مناسبت‌های شخصی خود را در تقویم کادوچی ثبت و پیگیری کنید.",
  alternates: { canonical: "/occasions" },
};

export default function Page() {
  return <OccasionsPage />;
}
