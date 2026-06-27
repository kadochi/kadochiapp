// src/app/(front)/profile/orders/OrdersPageClient.tsx
"use client";

import { useMemo, useState } from "react";
import Divider from "@/components/ui/Divider/Divider";
import Tabs from "@/components/ui/Tabs/Tabs";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import Button from "@/components/ui/Button/Button";
import Header from "@/components/layout/Header/Header";
import s from "./orders.module.css";
import { inGroup, TABS, type GroupKey, type Order } from "./orders.helpers";
import { useOrders } from "./useOrders";
import OrderCard from "./OrderCard";

export default function OrdersPageClient({
  initialOrders = [] as Order[],
}: {
  initialOrders?: Order[];
}) {
  const [active, setActive] = useState<GroupKey>("current");
  const { orders, loading, err, hasMore, loaderRef, onRetry } =
    useOrders(initialOrders);

  const filtered = useMemo(
    () => orders.filter((o) => inGroup(o.status, active)),
    [orders, active],
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

        {!loading && !err && orders.length === 0 ? (
          <StateMessage
            imageSrc="/images/order-list-empty.png"
            title="هنوز سفارشی ثبت نکرده‌اید"
            subtitle="پس از ثبت اولین سفارش، آن‌ها را در این بخش مشاهده خواهید کرد."
          />
        ) : null}

        {filtered.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}

        {!err && filtered.length > 0 ? (
          <div
            ref={loaderRef}
            style={{ display: "grid", placeItems: "center", padding: "16px" }}
          >
            {loading && hasMore ? (
              <div className={s.moreDone} aria-live="polite">
                در حال بارگذاری سفارش‌های بیشتر...
              </div>
            ) : !hasMore ? (
              <div className={s.moreDone} aria-live="polite">
                همه سفارش‌ها نمایش داده شده است.
              </div>
            ) : null}
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
