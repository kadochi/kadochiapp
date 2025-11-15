// src/app/(front)/profile/orders/OrdersPageClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Divider from "@/components/ui/Divider/Divider";
import Tabs, { type TabItem } from "@/components/ui/Tabs/Tabs";
import Label from "@/components/ui/Label/Label";
import SumPrice from "@/components/layout/Price/Sum/SumPrice";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import Button from "@/components/ui/Button/Button";
import Header from "@/components/layout/Header/Header";
import s from "./orders.module.css";

type RawWooStatus =
  | "pending"
  | "pending-payment"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft"
  | string;

type Status =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "canceled"
  | "refunded"
  | "failed"
  | "draft";

type LineItem = {
  id: number | string;
  product_id?: number | string | null;
  name?: string;
  quantity?: number;
  image?: { src: string; alt?: string } | null;
};

type Order = {
  id: number | string;
  status: Status;
  created_at: string;
  total: number;
  line_items: LineItem[];
};

type GroupKey = "current" | "completed" | "canceled";

const TABS: TabItem[] = [
  { id: "current", label: "جاری" },
  { id: "completed", label: "تحویل‌شده" },
  { id: "canceled", label: "لغو شده" },
];

function mapStatus(raw?: RawWooStatus): Status {
  const v = String(raw || "")
    .toLowerCase()
    .replace(/\s+/g, "-");
  switch (v) {
    case "pending":
    case "pending-payment":
      return "pending";
    case "processing":
      return "processing";
    case "on-hold":
      return "on-hold";
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "canceled";
    case "refunded":
      return "refunded";
    case "failed":
      return "failed";
    case "draft":
      return "draft";
    default:
      return "pending";
  }
}

function inGroup(status: Status, g: GroupKey) {
  if (g === "current")
    return (
      status === "pending" || status === "processing" || status === "on-hold"
    );
  if (g === "completed") return status === "completed";
  if (g === "canceled")
    return (
      status === "canceled" ||
      status === "refunded" ||
      status === "failed" ||
      status === "draft"
    );
  return true;
}

function normalizeOrders(payload: any): Order[] {
  const list =
    (Array.isArray(payload) && payload) ||
    payload?.items ||
    payload?.orders ||
    payload?.data ||
    [];
  return (list as any[]).map((o) => {
    const rawItems: any[] = o?.line_items ?? o?.items ?? [];
    const line_items: LineItem[] = rawItems.map((li) => {
      const candidate =
        li?.image?.src ||
        li?.image?.url ||
        li?.image ||
        li?.image_url ||
        li?.thumbnail ||
        "";
      return {
        id:
          li?.id ??
          li?.item_id ??
          li?.product_id ??
          `${li?.name || "li"}:${li?.product_id || ""}`,
        product_id: li?.product_id ?? null,
        name: li?.name,
        quantity: li?.quantity,
        image: candidate ? { src: String(candidate), alt: li?.name } : null,
      };
    });
    return {
      id: o?.id ?? o?.order_id ?? "",
      status: mapStatus(o?.status),
      created_at: o?.created_at ?? o?.date_created ?? new Date().toISOString(),
      total: Number(o?.total ?? o?.total_price ?? 0),
      line_items,
    };
  });
}

function toman(n: number) {
  return Math.round((Number(n) || 0) / 10);
}

function badgeFor(s: Status): {
  type: "primary" | "secondary" | "warning" | "danger" | "deactive";
  style: "solid" | "tonal" | "gradient";
  text: string;
} {
  switch (s) {
    case "pending":
      return { type: "danger", style: "tonal", text: "در انتظار پرداخت" };
    case "processing":
      return { type: "primary", style: "tonal", text: "در حال آماده‌سازی" };
    case "on-hold":
      return { type: "warning", style: "tonal", text: "در انتظار بررسی" };
    case "completed":
      return { type: "secondary", style: "tonal", text: "تحویل‌شده" };
    case "canceled":
    case "refunded":
    case "failed":
    case "draft":
      return { type: "deactive", style: "tonal", text: "لغو شده" };
    default:
      return { type: "deactive", style: "tonal", text: "نامشخص" };
  }
}

const PER_PAGE = 5;

export default function OrdersPageClient({
  initialOrders = [] as Order[],
}: {
  initialOrders?: Order[];
}) {
  const [active, setActive] = useState<GroupKey>("current");
  const [orders, setOrders] = useState<Order[]>(() =>
    normalizeOrders(initialOrders)
  );
  const [page, setPage] = useState(orders.length > 0 ? 1 : 0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [hasMore, setHasMore] = useState<boolean>(true);

  const lastReqId = useRef(0);

  const fetchPage = useCallback(async (nextPage: number) => {
    const reqId = ++lastReqId.current;
    setLoading(true);
    setErr("");

    const ctl = new AbortController();

    try {
      const r = await fetch(
        `/api/orders?page=${nextPage}&per_page=${PER_PAGE}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          signal: ctl.signal,
        }
      );
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json().catch(() => ({ items: [] }));
      if (reqId !== lastReqId.current) return;

      const newItems = normalizeOrders(data);
      setOrders((prev) => (nextPage === 1 ? newItems : [...prev, ...newItems]));
      setPage(nextPage);
      setHasMore(Array.isArray(newItems) && newItems.length === PER_PAGE);
    } catch {
      if (reqId === lastReqId.current) setErr("خطا در بارگذاری سفارش‌ها");
    } finally {
      if (reqId === lastReqId.current) setLoading(false);
    }
  }, []);

  // Refetch orders on visibility/focus to keep list fresh (e.g., after payment)
  useEffect(() => {
    function onFocus() {
      fetchPage(1);
    }
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onFocus();
    });
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus as any);
    };
  }, [fetchPage]);

  useEffect(() => {
    if ((initialOrders?.length ?? 0) === 0 && page === 0) {
      fetchPage(1);
    } else {
      setHasMore((initialOrders?.length ?? 0) === PER_PAGE);
      if (page === 0) setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () => orders.filter((o) => inGroup(o.status, active)),
    [orders, active]
  );

  const onRetry = () => fetchPage(page || 1);
  const onLoadMore = () => !loading && hasMore && fetchPage(page + 1);

  return (
    <div className={s.page} dir="rtl">
      <Header variant="internal" title="سفارش‌های من" backUrl="/profile" />

      <div className={s.tabsWrap}>
        <Tabs
          items={TABS}
          value={active}
          onChange={(id) => setActive(id as GroupKey)}
          className={s.tabs}
        />
      </div>

      <Divider />

      <div className={s.list} aria-live="polite">
        {loading && orders.length === 0
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={s.skelOrder}>
                <div className={s.skelRowTop}>
                  <div className={s.skelMeta}>
                    <div className={`${s.skelLine} ${s.skelLineLong}`} />
                    <div className={`${s.skelLine} ${s.skelLineShort}`} />
                  </div>
                  <div className={s.skelPrice} />
                </div>
                <div className={s.skelRowBottom}>
                  <div className={s.skelThumbs}>
                    <div className={s.skelThumb} />
                    <div className={s.skelThumb} />
                  </div>
                  <div className={s.skelPrice} />
                </div>
              </div>
            ))
          : null}

        {err && orders.length === 0 ? (
          <StateMessage
            imageSrc="/images/illustration-failed.png"
            title="خطا در بارگذاری"
            subtitle="لطفاً دوباره تلاش کنید."
            actions={
              <Button
                as="button"
                type="secondary"
                style="filled"
                size="small"
                onClick={onRetry}
                aria-label="تلاش مجدد"
              >
                تلاش مجدد
              </Button>
            }
          />
        ) : null}

        {!loading && !err && filtered.length === 0 && orders.length > 0 ? (
          <StateMessage
            imageSrc="/images/order-list-empty.png"
            title="لیست خالی است!"
            subtitle="در حال حاضر هیچ سفارشی در این وضعیت ندارید."
          />
        ) : null}

        {filtered.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}

        {!err && filtered.length > 0 ? (
          <div
            style={{ display: "grid", placeItems: "center", padding: "16px" }}
          >
            {hasMore ? (
              <Button
                as="button"
                className={s.moreBtn}
                type="tertiary"
                style="outline"
                size="medium"
                onClick={onLoadMore}
                disabled={loading}
                aria-label="نمایش سفارش‌های بیشتر"
              >
                {loading ? "در حال بارگذاری..." : "نمایش بیشتر"}
              </Button>
            ) : (
              <div className={s.moreDone} aria-live="polite">
                همه سفارش‌ها نمایش داده شده است.
              </div>
            )}
          </div>
        ) : null}

        {err && orders.length > 0 ? (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              gap: 8,
              padding: 16,
            }}
          >
            <div className={s.error}>خطا در دریافت صفحه بعد</div>
            <Button
              as="button"
              className={s.moreBtn}
              type="tertiary"
              style="outline"
              size="small"
              onClick={onRetry}
              aria-label="تلاش مجدد"
            >
              تلاش مجدد
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  const date = useMemo(() => {
    try {
      return new Date(order.created_at).toLocaleDateString("fa-IR");
    } catch {
      return order.created_at;
    }
  }, [order.created_at]);

  const items = order.line_items ?? [];
  const thumbs = items
    .map((li) => ({
      key: String(li.id),
      src: li.image?.src || "/images/placeholder.svg",
      alt: li.image?.alt || li.name || "",
    }))
    .slice(0, 2);
  const extra = Math.max(0, items.length - thumbs.length);

  const priceToman = toman(order.total);
  const badge = badgeFor(order.status);

  return (
    <Link
      href={`/profile/orders/${order.id}`}
      className={s.card}
      aria-label={`مشاهده سفارش ${order.id}`}
    >
      <div className={s.rowTop}>
        <div className={s.meta}>
          <div className={s.orderId}>سفارش #{order.id}</div>
          <div className={s.orderDate}>{date}</div>
        </div>
        <div className={s.rightSide}>
          <Label type={badge.type} style={badge.style} size="medium">
            {badge.text}
          </Label>
          <img
            src="/icons/chevron-left.svg"
            alt=""
            width={32}
            height={32}
            className={s.chev}
            aria-hidden
          />
        </div>
      </div>

      <div className={s.rowBottom}>
        <div className={s.total}>
          <SumPrice amount={priceToman} orientation="vertical" />
        </div>

        <div className={s.thumbs}>
          {thumbs.map((t) => (
            <img
              key={t.key}
              src={t.src}
              alt={t.alt}
              width={56}
              height={56}
              className={s.thumb}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                const el = e.currentTarget;
                if (el.src.endsWith("/images/placeholder.svg")) return;
                el.src = "/images/placeholder.svg";
              }}
            />
          ))}
          {extra > 0 && <div className={s.more}>+{extra}</div>}
        </div>
      </div>
    </Link>
  );
}
