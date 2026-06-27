"use client";

import { useMemo } from "react";
import Link from "next/link";
import Label from "@/components/ui/Label/Label";
import SumPrice from "@/components/layout/Price/Sum/SumPrice";
import { badgeFor, toman, type Order } from "./orders.helpers";
import s from "./orders.module.css";

export default function OrderCard({ order }: { order: Order }) {
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
