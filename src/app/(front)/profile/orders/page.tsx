import type { Metadata } from "next";
import OrdersPageClient from "./OrdersPageClient";
import { listOrdersForSession } from "@/lib/api/orders";

export const metadata: Metadata = {
  title: "سفارش‌های من",
  description: "لیست سفارش‌های جاری، تحویل‌شده و لغوشده شما در کادوچی.",
};

export default async function Page() {
  let initialOrders: Awaited<ReturnType<typeof listOrdersForSession>> = [];
  try {
    initialOrders = await listOrdersForSession();
  } catch (err: any) {
    if (err?.status === 401) {
      initialOrders = [];
    } else {
      console.error("[orders] initial fetch failed", err);
    }
  }

  return <OrdersPageClient initialOrders={initialOrders} />;
}
