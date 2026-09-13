import { redirect } from "next/navigation";

import { Header } from "@/components/layout/header";
import { getStoredAuthToken } from "@/features/auth/services/auth.server";
import { orderSummary } from "@/features/checkout/services/checkout.server";
import { hasApiErrorCode } from "@/lib/http/errors";
import { resolvePaymentResult } from "@/features/payment/payment-result";
import StateMessage from "@/components/layout/state-message";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ order?: string | string[] }> };

export default async function CheckoutReturnRoute({ searchParams }: Props) {
  const order = (await searchParams).order;
  const orderId = typeof order === "string" ? Number(order) : NaN;
  if (!Number.isSafeInteger(orderId) || orderId < 1) {
    return <><Header variant="internal" title="وضعیت پرداخت" backUrl="/products" /><StateMessage imageSrc="/images/illustration-failed.png" title="وضعیت پرداخت قابل بررسی نیست" subtitle="اطلاعات بازگشت پرداخت معتبر نیست." /></>;
  }
  if (!(await getStoredAuthToken())) redirect(`/login?next=${encodeURIComponent(`/checkout/return?order=${orderId}`)}`);
  let summary;
  try {
    summary = await orderSummary(orderId, crypto.randomUUID());
  } catch (error) {
    if (hasApiErrorCode(error, "unauthenticated")) redirect(`/login?next=${encodeURIComponent(`/checkout/return?order=${orderId}`)}`);
    return <><Header variant="internal" title="وضعیت پرداخت" backUrl="/products" /><p className="mx-auto max-w-[640px] px-16 py-32 text-center text-label-14">وضعیت سفارش قابل دریافت نیست.</p></>;
  }
  const payment = resolvePaymentResult(summary);
  if (payment.kind !== "neutral") redirect(payment.href);
  const isPending = payment.state === "pending";
  return <><Header variant="internal" title="وضعیت پرداخت" backUrl="/products" /><StateMessage imageSrc="/images/illustration-failed.png" title={isPending ? "پرداخت در حال بررسی است" : "وضعیت پرداخت نامشخص است"} subtitle={isPending ? "نتیجه پرداخت هنوز از درگاه دریافت نشده است. لطفاً بعداً از بخش سفارش‌های من وضعیت را بررسی کنید." : "نتیجه پرداخت هنوز قابل تأیید نیست. مبلغی را دوباره پرداخت نکنید و بعداً از بخش سفارش‌های من وضعیت را بررسی کنید."} /></>;
}
