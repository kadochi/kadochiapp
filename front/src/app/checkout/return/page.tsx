import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { getStoredAuthToken } from "@/features/auth/services/auth.server";
import { orderSummary } from "@/features/checkout/services/checkout.server";
import { ServiceError } from "@/lib/http/errors";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ order?: string | string[] }> };

export default async function CheckoutReturnRoute({ searchParams }: Props) {
  const order = (await searchParams).order;
  const orderId = typeof order === "string" ? Number(order) : NaN;
  if (!Number.isSafeInteger(orderId) || orderId < 1) redirect("/checkout/failure");
  if (!(await getStoredAuthToken())) redirect(`/login?next=${encodeURIComponent(`/checkout/return?order=${orderId}`)}`);
  try {
    const summary = await orderSummary(orderId, crypto.randomUUID());
    redirect(`/checkout/${summary.paid ? "success" : "failure"}?order=${summary.id}`);
  } catch (error) {
    if (error instanceof ServiceError && error.detail.code === "unauthenticated") redirect(`/login?next=${encodeURIComponent(`/checkout/return?order=${orderId}`)}`);
    return <><Header variant="internal" title="وضعیت پرداخت" backUrl="/products" /><p className="mx-auto max-w-[640px] px-16 py-32 text-center text-label-14">وضعیت سفارش قابل دریافت نیست.</p></>;
  }
}
