// src/app/(front)/profile/orders/page.tsx
// Server component: fetch first page (5 items) and hydrate the client.

import type { Metadata } from "next";
import OrdersPageClient from "./OrdersPageClient";
import { listOrdersForSessionPaged } from "@/lib/api/orders";

export const metadata: Metadata = {
  title: "سفارش‌های من",
  description: "لیست سفارش‌های جاری، تحویل‌شده و لغوشده شما در کادوچی.",
};

const PER_PAGE = 5;

export default async function Page() {
  let initialOrders: Awaited<ReturnType<typeof listOrdersForSessionPaged>> = [];

  try {
    // First page (page=1)
    initialOrders = await listOrdersForSessionPaged(1, PER_PAGE);
  } catch (err: any) {
    if (err?.status !== 401) {
      console.error("[orders] initial fetch failed", err);
    }
    initialOrders = [];
  }

  return <OrdersPageClient initialOrders={initialOrders} />;
}
