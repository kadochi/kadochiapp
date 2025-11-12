import Header from "@/components/layout/Header/Header";
import SuccessClient from "./SuccessClient";
import { redirect } from "next/navigation";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const metadata = { title: "کادوچی | پرداخت موفق" };
export const dynamic = "force-dynamic";

function tomanIRTfromIRR(irr?: number) {
  const v = Math.max(0, Number(irr || 0));
  return Math.round(v / 10);
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, unknown>;
}) {
  const sp = searchParams ?? {};
  const orderId = (Array.isArray(sp.order) ? sp.order[0] : sp.order ?? "")
    .toString()
    .trim();

  if (!/^\d+$/.test(orderId)) {
    redirect("/profile/orders");
  }

  // همون منبع داده‌ای که صفحه‌ی جزئیات سفارش استفاده می‌کند
  let detail: any | undefined;
  try {
    detail = await getOrderDetailForSession(orderId);
  } catch (e: any) {
    redirect("/profile/orders");
  }
  if (!detail) {
    redirect("/profile/orders");
  }

  const orderDateISO: string =
    detail.created_at ||
    detail.date_created_gmt ||
    detail.date_created ||
    detail.createdAt ||
    "";

  const receiverName: string =
    (detail.receiver as string) ||
    [
      detail?.shipping?.first_name ||
        detail?.billing?.first_name ||
        detail?.shipping_first_name ||
        detail?.billing_first_name ||
        "",
      detail?.shipping?.last_name ||
        detail?.billing?.last_name ||
        detail?.shipping_last_name ||
        detail?.billing_last_name ||
        "",
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  let delivery: string = (detail.delivery_window as string) || "";
  if (!delivery) {
    const metaArr: any[] = Array.isArray(detail?.meta_data)
      ? detail.meta_data
      : [];
    const slotId =
      metaArr.find((m) => m?.key === "_kadochi_slot_id")?.value || "";
    if (slotId) {
      const [d, partRaw] = String(slotId).split("_");
      const part = String(partRaw || "").trim();
      try {
        const dt = new Date(d);
        const faDay = new Intl.DateTimeFormat("fa-IR", {
          weekday: "long",
        }).format(dt);
        const faDate = new Intl.DateTimeFormat("fa-IR", {
          day: "2-digit",
          month: "long",
        }).format(dt);
        const range =
          part === "صبح"
            ? "۱۰ الی ۱۳"
            : part === "ظهر"
            ? "۱۳ الی ۱۶"
            : part === "عصر"
            ? "۱۶ الی ۱۹"
            : "";
        delivery = `${faDay} ${faDate}${range ? ` | ${part} (${range})` : ""}`;
      } catch {
        delivery = slotId;
      }
    }
  }

  const paidIRTFromSummary = tomanIRTfromIRR(detail?.summary?.total);
  const metaArr: any[] = Array.isArray(detail?.meta_data)
    ? detail.meta_data
    : [];
  const paidIRTFromMeta =
    Number(metaArr.find((m) => m?.key === "_kadochi_total_irt")?.value) || 0;
  const paidIRT =
    paidIRTFromSummary || paidIRTFromMeta || Number(sp.paid ?? 0) || 0;

  return (
    <div>
      <Header
        variant="internal"
        title="نتیجه پرداخت"
        backUrl="/profile/orders"
      />
      <SuccessClient
        orderId={orderId}
        receiverName={receiverName}
        delivery={delivery}
        orderDateISO={orderDateISO}
        paidIRT={paidIRT}
      />
    </div>
  );
}
