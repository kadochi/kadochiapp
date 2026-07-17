import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { getStoredAuthToken } from "@/features/auth/services/auth.server";
import { OrderResult } from "@/features/checkout/components/order-result";
import { orderSummary } from "@/features/checkout/services/checkout.server";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ order?: string | string[] }> };

export default async function CheckoutSuccessRoute({ searchParams }: Props) {
  const value = (await searchParams).order;
  const orderId = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(orderId) || orderId < 1 || !(await getStoredAuthToken())) redirect("/login?next=/checkout");
  const summary = await orderSummary(orderId, crypto.randomUUID());
  if (!summary.paid) redirect(`/checkout/failure?order=${summary.id}`);
  return <><Header variant="internal" title="سفارش شما" backUrl="/products" /><OrderResult order={summary} paid /></>;
}
