import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileOrderDetailPage } from "@/features/profile/components/profile-order-detail-page";

export const metadata: Metadata = {
  title: "کادوچی | جزئیات سفارش",
  description: "مشاهده وضعیت و جزئیات سفارش شما در کادوچی.",
};

type PageProps = { params: Promise<{ orderId: string }> };

export default async function Page({ params }: PageProps) {
  const orderId = Number((await params).orderId);
  if (!Number.isSafeInteger(orderId) || orderId < 1) notFound();
  return <ProfileOrderDetailPage orderId={orderId} />;
}
