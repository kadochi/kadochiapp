"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageOpen } from "lucide-react";

import { Header } from "@/components/layout/header";
import SectionHeader from "@/components/layout/section-header";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { ProgressStepper } from "@/components/ui/progress-stepper";
import { useAuth } from "@/features/auth/auth-provider";
import { tomanAmount } from "@/features/cart/utils/money";
import { ServiceError } from "@/lib/http/errors";
import { cn } from "@/lib/utils";
import { getProfileOrder } from "../services/profile";
import type { ProfileOrderDetail } from "../types";
import { orderStatus } from "./profile-orders-page";

const ORDER_PROGRESS_LABELS = ["بررسی", "آماده‌سازی", "تحویل"] as const;
const CANCELLED_ORDER_STATUSES = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "failed",
  "draft",
]);

function formatMoney(money: ProfileOrderDetail["total"]) {
  return `${new Intl.NumberFormat("fa-IR").format(tomanAmount(money))} تومان`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  const day = new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  const time = new Intl.DateTimeFormat("fa-IR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date).replace("٫", ":");
  return `${day} • ${time}`;
}

function deliveryLabel(slot: string | null) {
  if (!slot) return "—";
  const match = /^(\d{4}-\d{2}-\d{2})-(10|13|16)$/.exec(slot);
  if (!match) return slot;
  const date = new Date(`${match[1]}T00:00:00`);
  const ends: Record<string, string> = { "10": "۱۳", "13": "۱۶", "16": "۱۹" };
  const starts: Record<string, string> = { "10": "۱۰", "13": "۱۳", "16": "۱۶" };
  return `${new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "long", day: "numeric" }).format(date)}، ساعت ${starts[match[2]]} تا ${ends[match[2]]}`;
}

function progressStepIndex(status: string) {
  if (status === "completed") return ORDER_PROGRESS_LABELS.length;
  if (status === "processing") return 2;
  if (status === "on-hold") return 1;
  return 0;
}

function DetailRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className="flex items-center justify-between gap-16 px-16 py-16"><span className="text-title-14 text-surface-neutral-high-emphasis">{label}</span><strong className={cn("break-words text-left text-title-14 font-regular text-surface-neutral-high-emphasis", emphasis && "font-bold")} dir="rtl">{value}</strong></div>;
}

function DetailLoading() {
  return (
    <div className="animate-pulse">
      <div className="mx-auto h-24 max-w-[400px] rounded-rounded bg-surface px-40 py-16" />
      <div className="grid gap-8 px-16 py-24"><div className="h-20 w-160 rounded-m bg-surface" /><div className="h-12 w-224 rounded-m bg-surface" /></div>
      <Divider size="md" variant="spacer" />
      <div className="grid gap-8 px-16 py-24"><div className="h-20 w-160 rounded-m bg-surface" /><div className="h-12 w-224 rounded-m bg-surface" /></div>
      <div className="px-16 pb-16">{Array.from({ length: 4 }, (_, index) => <div className="h-48 border-b border-border-low-emphasis bg-surface last:border-0" key={index} />)}</div>
      <Divider size="md" variant="spacer" />
      <div className="grid gap-8 px-16 py-24"><div className="h-20 w-160 rounded-m bg-surface" /><div className="h-12 w-224 rounded-m bg-surface" /></div>
      <div className="flex gap-12 px-16 pb-28"><div className="size-64 rounded-xl bg-surface" /><div className="size-64 rounded-xl bg-surface" /><div className="size-64 rounded-xl bg-surface" /></div>
    </div>
  );
}

function OrderItemThumbnail({ item }: { item: ProfileOrderDetail["items"][number] }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : item.imageUrl;

  return (
    <div className="grid size-64 shrink-0 place-items-center overflow-hidden rounded-xl border border-border-low-emphasis bg-surface-background">
      {imageUrl ? <img alt={item.name || ""} className="size-full object-cover" loading="lazy" onError={() => setImageFailed(true)} src={imageUrl} /> : <PackageOpen aria-hidden className="size-24 text-surface-neutral-mid-emphasis" />}
    </div>
  );
}

export function ProfileOrderDetailPage({ orderId }: { orderId: number }) {
  const router = useRouter();
  const { status } = useAuth();
  const [order, setOrder] = useState<ProfileOrderDetail | null>(null);
  const [error, setError] = useState<"notFound" | "generic" | null>(null);
  const [requestVersion, setRequestVersion] = useState(0);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void getProfileOrder(orderId).then((result) => {
      if (!cancelled) {
        setOrder(result);
        setError(null);
      }
    }).catch((caught: unknown) => {
      if (cancelled) return;
      setError(caught instanceof ServiceError && caught.detail.code === "not_found" ? "notFound" : "generic");
    });
    return () => { cancelled = true; };
  }, [orderId, requestVersion, status]);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/login?next=/profile/orders/${orderId}`);
  }, [orderId, router, status]);

  const orderStatusValue = order?.status ?? "pending";
  const orderCancelled = CANCELLED_ORDER_STATUSES.has(orderStatusValue);
  const steps = useMemo(
    () =>
      ORDER_PROGRESS_LABELS.map((label) => ({
        id: label,
        label,
        disabled: orderCancelled,
      })),
    [orderCancelled],
  );

  return (
    <div className="min-h-dvh bg-surface-background" dir="rtl">
      <Header backUrl="/profile/orders" title={`جزئیات سفارش #${orderId}`} variant="internal" />
      <main className="mx-auto w-full max-w-[720px]">
        {status === "loading" || (status === "authenticated" && !order && !error) ? <DetailLoading /> : null}
        {status === "anonymous" ? <StateMessage imageSrc="/images/login-illustration.png" subtitle="برای دیدن جزئیات سفارش وارد شوید." title="ورود لازم است" /> : null}
        {status === "error" ? <StateMessage imageSrc="/images/illustration-failed.png" subtitle="دریافت وضعیت حساب کاربری با مشکل مواجه شد. دوباره تلاش کنید." title="خطا در بارگذاری" /> : null}
        {error && !order ? <StateMessage actions={error === "generic" ? <Button onClick={() => setRequestVersion((current) => current + 1)} variant="secondary-filled">تلاش مجدد</Button> : undefined} imageSrc={error === "notFound" ? "/images/order-list-empty.png" : "/images/illustration-failed.png"} subtitle={error === "notFound" ? "این سفارش پیدا نشد یا به حساب شما تعلق ندارد." : "لطفاً دوباره تلاش کنید."} title={error === "notFound" ? "سفارش پیدا نشد" : "خطا در بارگذاری"} /> : null}
        {order ? <>
          <div className="mx-auto max-w-[400px] px-40 py-16"><ProgressStepper aria-label="وضعیت سفارش" dir="ltr" showStepNumber={false} size="md" steps={steps} value={progressStepIndex(orderStatusValue)} /></div>
          <SectionHeader
            leftSlot={<span className={cn("inline-flex h-28 items-center rounded-rounded px-12 text-label-12", orderStatus(order.status).className)}>{orderStatus(order.status).label}</span>}
            subtitle={formatDateTime(order.createdAt)}
            title={`شماره سفارش: #${order.id}`}
          />
          <Divider size="md" variant="spacer" />
          <SectionHeader subtitle="مشخصات فرستنده و گیرنده" title="جزئیات ارسال" />
          <div className="px-16 pb-16">
            <DetailRow label="فرستنده" value={order.sender || "—"} />
            <Divider />
            <DetailRow label="گیرنده" value={order.receiver || "—"} />
            <Divider />
            <DetailRow label="زمان ارسال" value={deliveryLabel(order.deliverySlot)} />
            <Divider />
            <DetailRow label="آدرس گیرنده" value={order.address || "—"} />
          </div>
          <Divider size="md" variant="spacer" />
          <SectionHeader subtitle="لیست محصولات" title="اقلام سفارش" />
          <div className="flex gap-12 overflow-x-auto px-16 py-12 pb-28">
            {order.items.slice(0, 8).map((item) => <OrderItemThumbnail item={item} key={item.id} />)}
          </div>
          <Divider size="md" variant="spacer" />
          <SectionHeader subtitle="مشخصات هزینه‌های سفارش" title="جزئیات پرداخت" />
          <div className="px-16 pb-16">
            <DetailRow label="جمع سفارش‌ها" value={formatMoney(order.summary.subtotal)} />
            <Divider />
            <DetailRow label="۱۰٪ مالیات بر ارزش افزوده" value={formatMoney(order.summary.tax)} />
            <Divider />
            <DetailRow label="هزینه ارسال" value={tomanAmount(order.summary.shipping) ? formatMoney(order.summary.shipping) : "رایگان"} />
            <Divider />
            <DetailRow label="هزینه بسته‌بندی و خدمات" value={formatMoney(order.summary.service)} />
            <Divider />
            <DetailRow emphasis label="جمع کل" value={formatMoney(order.summary.total)} />
          </div>
        </> : null}
      </main>
    </div>
  );
}
