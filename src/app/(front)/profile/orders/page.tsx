import type { Metadata } from "next";
import OrdersPageClient from "./OrdersPageClient";

export const metadata: Metadata = {
  title: "سفارش‌های من",
  description: "لیست سفارش‌های جاری، تحویل‌شده و لغوشده شما در کادوچی.",
};

export default function Page() {
  return <OrdersPageClient />;
}
