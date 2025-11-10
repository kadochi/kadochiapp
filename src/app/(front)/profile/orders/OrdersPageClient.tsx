"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import HeaderInternal from "@/components/layout/Header/HeaderInternal";
import Divider from "@/components/ui/Divider/Divider";
import Tabs, { type TabItem } from "@/components/ui/Tabs/Tabs";
import Label from "@/components/ui/Label/Label";
import SumPrice from "@/components/layout/Price/Sum/SumPrice";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import s from "./orders.module.css";
import OrderSkeleton from "./OrderSkeleton";
import Header from "@/components/layout/Header/Header";

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
        id: li?.id ?? li?.item_id ?? li?.product_id ?? Math.random(),
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

export default function OrdersPageClient({
  initialOrders = [],
}: {
  initialOrders?: Order[];
}) {
  const [active, setActive] = useState<GroupKey>("current");
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>(() =>
    normalizeOrders(initialOrders)
  );
  const [err, setErr] = useState<string>("");

  const lastReqId = useRef(0);

  const fetchOrders = async () => {
    const reqId = ++lastReqId.current;
    setLoading(true);
    setErr("");
    const ctl = new AbortController();
    try {
      const r = await fetch(`/api/orders`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: ctl.signal,
      });
      if (!r.ok) throw new Error(String(r.status));
      const data = await r.json().catch(() => []);
      if (reqId === lastReqId.current) setOrders(normalizeOrders(data));
    } catch {
      if (reqId === lastReqId.current) setErr("خطا در بارگذاری سفارش‌ها");
    } finally {
      if (reqId === lastReqId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (initialOrders.length === 0) fetchOrders();
  }, [initialOrders.length]);

  const filtered = useMemo(
    () => orders.filter((o) => inGroup(o.status, active)),
    [orders, active]
  );

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
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <OrderSkeleton key={i} />)
        ) : err ? (
          <div className={s.error}>{err}</div>
        ) : filtered.length === 0 ? (
          <StateMessage
            imageSrc="/images/order-list-empty.png"
            title="لیست خالی است!"
            subtitle="در حال حاضر هیچ سفارشی در این وضعیت ندارید."
          />
        ) : (
          filtered.map((o) => <OrderCard key={o.id} order={o} />)
        )}
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
