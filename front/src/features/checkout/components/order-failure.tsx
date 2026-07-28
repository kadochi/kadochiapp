"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { formatIrrAsToman } from "@/features/cart/utils/money";
import { retryProfileOrderPayment } from "@/features/profile/services/profile";
import type { OrderSummary } from "../types";
import { logPaymentFailure, paymentErrorMessage } from "../utils/payment-error";

export function OrderFailure({ order }: { order: OrderSummary }) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const recipient = [order.recipient.firstName, order.recipient.lastName]
    .filter(Boolean)
    .join(" ") || "—";

  async function retryPayment() {
    setRetrying(true);
    setRetryError(null);
    try {
      const { redirectUrl } = await retryProfileOrderPayment(order.id);
      window.location.assign(redirectUrl);
    } catch (error) {
      logPaymentFailure("failed_order_payment_retry_failed", error);
      setRetryError(paymentErrorMessage(error).message);
      setRetrying(false);
    }
  }

  return (
    <div className="relative mx-auto min-h-dvh max-w-[640px] bg-surface-background pb-[120px] [direction:rtl]">
      <main className="px-32 pt-72 text-right">
        <section className="text-center" aria-labelledby="payment-failure-title">
          <Image
            alt=""
            aria-hidden
            className="mx-auto block size-[200px] object-contain"
            height={200}
            src="/images/illustration-failed.png"
            width={200}
          />
          <h1 id="payment-failure-title" className="mb-8 mt-24 text-title-18 font-bold text-error">
            پرداخت ناموفق
          </h1>
          <p className="m-0 text-body-14 leading-[1.75] text-text-secondary">
            متاسفانه پرداخت سفارش با مشکل مواجه شد. لطفاً با انتخاب تلاش مجدد، پرداخت و ثبت سفارش خود را تکمیل نمایید.
          </p>
        </section>

        <section className="mt-56" aria-label="اطلاعات سفارش">
          <OrderDetail label="مبلغ قابل پرداخت" value={formatIrrAsToman(order.total)} />
          <OrderDetail label="فرستنده" value={order.sender || "—"} />
          <OrderDetail label="گیرنده" value={recipient} />
          <OrderDetail label="زمان ارسال" value={formatDeliverySlot(order.deliverySlot)} />
          <OrderDetail label="آدرس گیرنده" value={order.address || "—"} last />
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[1100] border-t border-border-mid-emphasis bg-surface-background px-16 pb-20 pt-12">
        <div className="mx-auto grid max-w-[640px] grid-cols-2 gap-16">
          <Button loading={retrying} onClick={() => void retryPayment()} size="large" variant="primary-filled">
            تلاش مجدد
          </Button>
          <Button asChild size="large" variant="tertiary-outline">
            <Link href="/products">انصراف</Link>
          </Button>
        </div>
        {retryError ? <p className="mx-auto mt-8 max-w-[640px] text-center text-label-12 text-error">{retryError}</p> : null}
      </div>
    </div>
  );
}

function OrderDetail({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-start justify-between gap-24 py-12 text-body-14 ${last ? "" : "border-b border-border-low-emphasis"}`}>
      <span className="shrink-0 text-text-secondary">{label}</span>
      <strong className="text-left font-bold text-text-primary">{value}</strong>
    </div>
  );
}

function formatDeliverySlot(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})-(10|13|16)$/);
  if (!match) return "—";
  const [, year, month, day, start] = match;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";

  const dateLabel = new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  const startHour = Number(start);
  return `${dateLabel}، ${startHour.toLocaleString("fa-IR")} الی ${(startHour + 3).toLocaleString("fa-IR")}`;
}
