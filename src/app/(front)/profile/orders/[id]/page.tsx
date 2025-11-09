import type { Metadata } from "next";
import { headers } from "next/headers";
import OrderDetailClient, { type OrderDetailData } from "./OrderDetailClient";

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  description: "مشاهده وضعیت سفارش و جزئیات",
};

export const dynamic = "force-dynamic";

async function fetchOrder(id: string): Promise<OrderDetailData | undefined> {
  try {
    const h = await headers();
    const cookie = h.get("cookie") ?? "";
    const r = await fetch(`/api/orders/${id}`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    });
    if (!r.ok) return undefined;
    return (await r.json()) as OrderDetailData;
  } catch {
    return undefined;
  }
}

type Params = { orderId?: string; id?: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params;
  const orderId = (p.orderId ?? p.id ?? "").trim();
  if (!orderId) return null;

  const initial = await fetchOrder(orderId);
  return <OrderDetailClient orderId={orderId} initialData={initial} />;
}
