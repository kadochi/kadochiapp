import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { getStoredAuthToken } from "@/features/auth/services/auth.server";
import { ClearPaidCart } from "@/features/checkout/components/clear-paid-cart";
import { OrderResult } from "@/features/checkout/components/order-result";
import { orderSummary } from "@/features/checkout/services/checkout.server";
import { isPendingPaymentOrder } from "@/features/checkout/services/paid-cart.server";
import { resolvePaymentResult } from "@/features/payment/payment-result";
import { hasApiErrorCode } from "@/lib/http/errors";
import StateMessage from "@/components/layout/state-message";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ order?: string | string[] }> };

export default async function CheckoutSuccessRoute({ searchParams }: Props) {
  const value = (await searchParams).order;
  const orderId = typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(orderId) || orderId < 1) {
    return <><Header variant="internal" title="وضعیت پرداخت" backUrl="/products" /><StateMessage imageSrc="/images/illustration-failed.png" title="پرداخت قابل تأیید نیست" subtitle="برای مشاهده وضعیت پرداخت، از لینک معتبر سفارش استفاده کنید." /></>;
  }
  if (!(await getStoredAuthToken())) redirect(`/login?next=${encodeURIComponent(`/checkout/success?order=${orderId}`)}`);
  let summary;
  try {
    summary = await orderSummary(orderId, crypto.randomUUID());
  } catch (error) {
    if (hasApiErrorCode(error, "unauthenticated")) redirect(`/login?next=${encodeURIComponent(`/checkout/success?order=${orderId}`)}`);
    return <><Header variant="internal" title="سفارش شما" backUrl="/products" /><StateMessage imageSrc="/images/illustration-failed.png" title="وضعیت سفارش در دسترس نیست" subtitle="لطفاً چند دقیقه دیگر دوباره وضعیت سفارش را بررسی کنید." /></>;
  }
  const payment = resolvePaymentResult(summary);
  if (payment.kind !== "success") redirect(payment.href);
  // Only the order this browser just paid for clears the cart; revisiting an
  // older success link must not wipe a cart the customer has since built.
  const clearsCart = await isPendingPaymentOrder(summary.id);
  return <><Header />{clearsCart ? <ClearPaidCart orderId={summary.id} /> : null}<OrderResult order={summary} state="paid" /></>;
}
