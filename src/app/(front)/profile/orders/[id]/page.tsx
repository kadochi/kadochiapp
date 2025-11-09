import type { Metadata } from "next";
import OrderDetailClient, { type OrderDetailData } from "./OrderDetailClient";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  description: "مشاهده وضعیت سفارش و جزئیات",
};

export const dynamic = "force-dynamic";

type Params = { orderId?: string; id?: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params;
  const orderId = (p.orderId ?? p.id ?? "").trim();
  if (!orderId) return null;

  let initial: OrderDetailData | undefined = undefined;
  try {
    const detail = await getOrderDetailForSession(orderId);
    if (detail) {
      initial = {
        ...detail,
        items: (detail.items || []).map((item) => ({
          ...item,
          image: item.image ?? undefined,
        })),
      } as OrderDetailData;
    }
  } catch (err: any) {
    if (err?.status && err.status !== 401 && err.status !== 404 && err.status !== 403) {
      console.error("[orders] detail prefetch failed", err);
    }
  }

  return <OrderDetailClient orderId={orderId} initialData={initial} />;
}
