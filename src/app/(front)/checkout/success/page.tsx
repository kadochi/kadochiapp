import Header from "@/components/layout/Header/Header";
import SuccessClient from "./SuccessClient";
import { cookies } from "next/headers";
import { getOrderDetailForSession } from "@/lib/api/orders";

export const dynamic = "force-dynamic";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | Promise<Record<string, string | string[] | undefined>>
  | undefined;

function pickFirst(value: string | string[] | undefined | null): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function toNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams?: SearchParamsInput;
}) {
  const resolved = (await Promise.resolve(searchParams)) ?? {};

  const queryOrder = pickFirst(resolved.order).trim();
  const queryPaid = pickFirst(resolved.paid).trim();

  const cookieStore = await cookies();
  const cookieOrder = decodeURIComponent(
    cookieStore.get("kadochi_order_id")?.value || ""
  ).trim();
  const cookiePaid = cookieStore.get("kadochi_pay_amount")?.value || "";

  const orderIdRaw = queryOrder || cookieOrder;
  const orderIdDigits = orderIdRaw.replace(/[^\d]/g, "");

  let orderDetail: Awaited<ReturnType<typeof getOrderDetailForSession>> = null;
  try {
    if (orderIdDigits) {
      orderDetail = await getOrderDetailForSession(orderIdDigits);
    }
  } catch {
    orderDetail = null;
  }

  if (orderIdDigits) {
    try {
      cookieStore.delete("kadochi_order_id");
      cookieStore.delete("kadochi_pay_amount");
    } catch {}
  }

  const resolvedOrderId = orderIdDigits || String(orderDetail?.id || "").trim();

  const detailTotalIrr = Number(orderDetail?.summary?.total || 0);
  const detailPaid = detailTotalIrr > 0 ? Math.round(detailTotalIrr / 10) : 0;
  const paidCandidate = toNumber(queryPaid);
  const paidFromCookie = toNumber(cookiePaid);
  const paidIRT = [paidCandidate, paidFromCookie, detailPaid].find(
    (v) => Number.isFinite(v) && v > 0
  ) || 0;

  const receiverName = orderDetail?.receiver || "";
  const deliveryWindow = orderDetail?.delivery_window || "";
  const orderDateISO = orderDetail?.created_at || "";

  return (
    <>
      <Header />
      <SuccessClient
        orderId={resolvedOrderId}
        receiverName={receiverName}
        delivery={deliveryWindow}
        orderDateISO={orderDateISO}
        paidIRT={paidIRT}
      />
    </>
  );
}
