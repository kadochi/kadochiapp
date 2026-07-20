"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, PackageOpen, RefreshCw } from "lucide-react";

import { Header } from "@/components/layout/header";
import { SumPrice } from "@/components/layout/price";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-provider";
import { tomanAmount } from "@/features/cart/utils/money";
import { listProfileOrders } from "../services/profile";
import type { ProfileOrder } from "../types";

type OrderGroup = "current" | "completed" | "cancelled";

const orderGroups: Array<{ id: OrderGroup; label: string }> = [
  { id: "current", label: "جاری" },
  { id: "completed", label: "تحویل‌شده" },
  { id: "cancelled", label: "لغوشده" },
];

function orderGroup(status: string): OrderGroup {
  if (status === "completed") return "completed";
  if (["cancelled", "canceled", "refunded", "failed", "draft"].includes(status))
    return "cancelled";
  return "current";
}

function orderStatus(status: string) {
  switch (status) {
    case "pending":
    case "pending-payment":
      return {
        label: "در انتظار پرداخت",
        variant: "danger" as const,
        className: "bg-error-container text-on-error-container",
      };
    case "processing":
      return {
        label: "در حال آماده‌سازی",
        variant: "success" as const,
        className: "bg-primary-container text-on-primary-container",
      };
    case "on-hold":
      return {
        label: "در انتظار بررسی",
        variant: "warning" as const,
        className: "bg-warning-container text-on-warning-container",
      };
    case "completed":
      return {
        label: "تحویل‌شده",
        variant: "secondary" as const,
        className: "bg-secondary-container text-on-secondary-container",
      };
    case "refunded":
      return {
        label: "لغو شده",
        variant: "neutral" as const,
        className: "bg-surface-dim text-surface-neutral-mid-emphasis",
      };
    default:
      return {
        label: "لغو شده",
        variant: "neutral" as const,
        className: "bg-disable-container text-on-disable",
      };
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("fa-IR").format(date);
}

function OrderCard({ order }: { order: ProfileOrder }) {
  const status = orderStatus(order.status);
  const visibleItems = order.items.slice(0, 2);
  const hiddenItemCount = Math.max(0, order.items.length - visibleItems.length);

  return (
    <Link
      className="grid gap-16 border-b border-border-low-emphasis bg-surface-background py-24 text-surface-neutral-high-emphasis no-underline transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
      href={`/profile/orders/${order.id}`}
    >
      <div className="flex items-center justify-between gap-12">
        <div className="grid gap-4">
          <strong className="text-title-16 font-bold leading-[var(--text-title-16--line-height)] text-surface-neutral-high-emphasis">
            سفارش #{new Intl.NumberFormat("fa-IR").format(order.id)}
          </strong>
          <span className="text-label-12 text-surface-neutral-mid-emphasis">
            {formatDate(order.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-12">
          <Label appearance="soft" size="md" variant={status.variant}>
            {status.label}
          </Label>
          <ChevronLeft
            aria-hidden
            className="size-20 text-surface-neutral-mid-emphasis"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-16">
        <SumPrice amount={tomanAmount(order.total)} orientation="vertical" />
        <div
          className="flex min-h-56 items-center gap-8"
          aria-label={`${order.items.length} محصول در سفارش`}
        >
          {visibleItems.map((item) => (
            <div
              className="grid size-56 place-items-center overflow-hidden rounded-[var(--radius-l)] border border-border-low-emphasis bg-surface-background"
              key={item.id}
            >
              {item.imageUrl ? (
                <img
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  src={item.imageUrl}
                />
              ) : (
                <PackageOpen
                  aria-hidden
                  className="size-20 text-surface-neutral-mid-emphasis"
                />
              )}
            </div>
          ))}
          {hiddenItemCount ? (
            <span
              className="grid size-56 place-items-center rounded-[var(--radius-l)] border border-border-low-emphasis bg-surface-background text-title-16 font-bold text-surface-neutral-mid-emphasis"
              dir="ltr"
            >
              +{new Intl.NumberFormat("fa-IR").format(hiddenItemCount)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

function OrdersLoading() {
  return (
    <div className="grid px-16">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          className="h-156 animate-pulse border-b border-border-low-emphasis bg-surface"
          key={index}
        />
      ))}
    </div>
  );
}

export function ProfileOrdersPage() {
  const router = useRouter();
  const { status } = useAuth();
  const [activeGroup, setActiveGroup] = useState<OrderGroup>("current");
  const [orders, setOrders] = useState<ProfileOrder[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const loadPage = useCallback(
    async (requestedPage: number, append = false) => {
      setLoading(true);
      setError(false);
      try {
        const result = await listProfileOrders(requestedPage);
        setOrders((current) =>
          append ? [...current, ...result.items] : result.items,
        );
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => void loadPage(1), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage, status]);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login?next=/profile/orders");
  }, [router, status]);

  const visibleOrders = useMemo(
    () => orders.filter((order) => orderGroup(order.status) === activeGroup),
    [activeGroup, orders],
  );
  const canLoadMore = page > 0 && page < totalPages;

  return (
    <div className="min-h-dvh bg-surface-background" dir="rtl">
      <Header backUrl="/profile" title="سفارش‌های من" variant="internal" />
      <main className="mx-auto w-full max-w-[720px]">
        <div className="px-16 pb-16">
          <Tabs
            onValueChange={(value) => setActiveGroup(value as OrderGroup)}
            value={activeGroup}
          >
            <TabsList aria-label="وضعیت سفارش‌ها">
              {orderGroups.map((group) => (
                <TabsTrigger key={group.id} value={group.id}>
                  {group.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <Divider />

        {status === "loading" || (loading && !orders.length) ? (
          <OrdersLoading />
        ) : null}
        {status === "anonymous" ? (
          <StateMessage
            imageSrc="/images/login-illustration.png"
            subtitle="برای دیدن سفارش‌ها وارد حساب کاربری خود شوید."
            title="ورود لازم است"
          />
        ) : null}
        {status === "error" ? (
          <StateMessage
            imageSrc="/images/illustration-failed.png"
            subtitle="دریافت وضعیت حساب کاربری با مشکل مواجه شد. دوباره تلاش کنید."
            title="خطا در بارگذاری"
          />
        ) : null}
        {error && !orders.length ? (
          <StateMessage
            actions={
              <Button
                onClick={() => void loadPage(1)}
                variant="secondary-filled"
              >
                <RefreshCw aria-hidden /> تلاش مجدد
              </Button>
            }
            imageSrc="/images/illustration-failed.png"
            subtitle="لطفاً دوباره تلاش کنید."
            title="خطا در بارگذاری سفارش‌ها"
          />
        ) : null}
        {!loading && !error && status === "authenticated" && !orders.length ? (
          <StateMessage
            imageSrc="/images/order-list-empty.png"
            subtitle="بعد از ثبت سفارش، جزئیات آن را اینجا می‌بینید."
            title="هنوز سفارشی ندارید"
          />
        ) : null}
        {!loading &&
        !error &&
        orders.length > 0 &&
        visibleOrders.length === 0 ? (
          <StateMessage
            imageSrc="/images/order-list-empty.png"
            subtitle="در این وضعیت سفارشی وجود ندارد."
            title="لیست خالی است"
          />
        ) : null}

        {visibleOrders.length ? (
          <div className="grid gap-8 px-16 pt-16 pb-16 [&>*:last-child]:border-b-0">
            {visibleOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : null}
        {canLoadMore ? (
          <div className="flex justify-center px-16 pb-32">
            <Button
              loading={loading}
              onClick={() => void loadPage(page + 1, true)}
              variant="tertiary-outline"
            >
              نمایش سفارش‌های بیشتر
            </Button>
          </div>
        ) : null}
        {error && orders.length ? (
          <div className="flex justify-center px-16 pb-32">
            <Button
              onClick={() => void loadPage(page || 1, Boolean(page))}
              variant="tertiary-outline"
            >
              <RefreshCw aria-hidden /> تلاش مجدد
            </Button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export { orderStatus };
