import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { getStoredAuthToken } from "@/features/auth/services/auth.server";
import { OrderResult } from "@/features/checkout/components/order-result";
import { orderSummary } from "@/features/checkout/services/checkout.server";
import { hasApiErrorCode } from "@/lib/http/errors";
import StateMessage from "@/components/layout/state-message";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ order?: string | string[] }> };

export default async function CheckoutFailureRoute({ searchParams }: Props) {
  const value = (await searchParams).order;
  const orderId = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(orderId) || orderId < 1 || !(await getStoredAuthToken())) redirect("/login?next=/checkout");
  let summary;
  try {
    summary = await orderSummary(orderId, crypto.randomUUID());
  } catch (error) {
    if (hasApiErrorCode(error, "unauthenticated")) redirect(`/login?next=${encodeURIComponent(`/checkout/failure?order=${orderId}`)}`);
    return <><Header variant="internal" title="وضعیت سفارش" backUrl="/products" /><StateMessage imageSrc="/images/illustration-failed.png" title="وضعیت سفارش در دسترس نیست" subtitle="لطفاً چند دقیقه دیگر دوباره وضعیت سفارش را بررسی کنید." /></>;
  }
  if (summary.paid) redirect(`/checkout/success?order=${summary.id}`);
  return <><Header variant="internal" title="وضعیت سفارش" backUrl="/products" /><OrderResult order={summary} paid={false} /></>;
}
