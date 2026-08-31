import Link from "next/link";

import { Button } from "@/components/ui/button";
import StateMessage from "@/components/layout/state-message";
import { formatIrrAsToman } from "@/features/cart/utils/money";
import { OrderCelebration } from "./order-celebration";
import { OrderFailure } from "./order-failure";
import type { OrderSummary } from "../types";

export function OrderResult({ order, paid }: { order: OrderSummary; paid: boolean }) {
  if (paid) return <OrderSuccess order={order} />;
  return <OrderFailure order={order} />;
}

function OrderSuccess({ order }: { order: OrderSummary }) {
  const recipient = [order.recipient.firstName, order.recipient.lastName].filter(Boolean).join(" ").trim();
  return (
    <div className="relative mx-auto min-h-[calc(100dvh-88px)] bg-surface-background pb-[112px] [direction:rtl]">
      <OrderCelebration />
      <main className="mx-auto max-w-[580px] px-24 text-center">
        <StateMessage
          imageSrc="/images/success-illustration.png"
          title="سفارش شما ثبت شد!"
          subtitle="می‌توانید وضعیت سفارش را در بخش سفارش‌های من دنبال کنید."
          className="px-0 pb-0"
        />

        <div className="mt-24" role="list" aria-label="اطلاعات سفارش">
          <SuccessRow label="مبلغ پرداخت‌شده" value={formatIrrAsToman(order.total)} />
          <SuccessDivider />
          <SuccessRow label="شماره سفارش" value={`#${order.id.toLocaleString("fa-IR")}`} />
          <SuccessDivider />
          <SuccessRow label="تاریخ سفارش" value={formatOrderDate(order.createdAt)} />
          <SuccessDivider />
          <SuccessRow label="گیرنده" value={recipient || "—"} />
          <SuccessDivider />
          <SuccessRow label="روز و ساعت تحویل" value={formatDeliverySlot(order.deliverySlot)} />
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-[1100] border-t border-border-mid-emphasis bg-surface-background px-16 pb-32 pt-16">
        <Button asChild className="mx-auto flex w-full max-w-[580px]" size="large" variant="primary-filled">
          <Link href="/profile/orders">مشاهده سفارش‌های من</Link>
        </Button>
      </div>
    </div>
  );
}

function SuccessRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-12 px-16 text-right text-body-16" role="listitem">
      <span className="text-text-secondary">{label}</span>
      <strong className="text-left font-bold text-text-primary">{value}</strong>
    </div>
  );
}

function SuccessDivider() {
  return <div className="my-16 border-t border-dashed border-border-low-emphasis" aria-hidden />;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDeliverySlot(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})-(10|13|16|19)$/);
  if (!match) return "—";
  const [, year, month, day, start] = match;
  const end = Number(start) + 3;
  const date = new Date(`${year}-${month}-${day}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  const label = new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  return `${label}، ${Number(start).toLocaleString("fa-IR")} تا ${end.toLocaleString("fa-IR")}`;
}
