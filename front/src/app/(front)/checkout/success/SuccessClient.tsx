"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import Lottie from "lottie-react";
import Button from "@/components/ui/Button/Button";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import { useBasket } from "@/domains/basket/state/basket-context";
import ConfettiAnim from "@/assets/Celebration.json";
import s from "./success.module.css";

type Props = {
  orderId: string;
  receiverName: string;
  delivery: string;
  orderDateISO?: string;
  /** Paid amount in IRT (toman) already converted on the server */
  paidIRT?: number;
};

function toman(n?: number) {
  return Math.max(0, Number(n || 0)).toLocaleString("fa-IR");
}

/**
 * SuccessClient
 * - Plays lottie (success only)
 * - Clears basket once
 * - Shows paid amount, order id, created date, receiver, delivery window
 * - Pure client UI; no data fetching here
 */
export default function SuccessClient({
  orderId,
  receiverName,
  delivery,
  orderDateISO,
  paidIRT = 0,
}: Props) {
  // Format order date (fixed, from Woo / API)
  const orderDateText = useMemo(() => {
    try {
      if (!orderDateISO) return "—";
      const d = new Date(orderDateISO);
      if (isNaN(d.getTime())) return "—";
      return d.toLocaleString("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  }, [orderDateISO]);

  // Clear basket once (on success page only)
  const { updateQuantity } = useBasket();
  const clearedRef = useRef(false);
  useEffect(() => {
    if (clearedRef.current) return;
    clearedRef.current = true;
    try {
      updateQuantity({});
    } catch {}
  }, [updateQuantity]);

  return (
    <div className={s.page} dir="rtl">
      <div className={s.confettiWrap} aria-hidden>
        <Lottie
          animationData={ConfettiAnim}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <main className={s.wrap}>
        <StateMessage
          imageSrc="/images/success-illustration.png"
          imageAlt=""
          title="سفارش شما ثبت شد!"
          subtitle="می‌توانید وضعیت سفارش را در بخش سفارش‌های من دنبال کنید."
        />

        <div className={s.infoList} role="list">
          {/* Paid amount (IRT) */}
          <div className={s.infoRow} role="listitem">
            <span className={s.infoKey}>مبلغ پرداخت‌شده</span>
            <span className={s.infoVal}>{toman(paidIRT)} تومان</span>
          </div>

          <div className={s.sep} aria-hidden />

          <div className={s.infoRow} role="listitem">
            <span className={s.infoKey}>شماره سفارش</span>
            <span className={s.infoVal}>{orderId ? `#${orderId}` : "—"}</span>
          </div>

          <div className={s.sep} aria-hidden />

          <div className={s.infoRow} role="listitem">
            <span className={s.infoKey}>تاریخ سفارش</span>
            <span className={s.infoVal}>{orderDateText}</span>
          </div>

          <div className={s.sep} aria-hidden />

          <div className={s.infoRow} role="listitem">
            <span className={s.infoKey}>گیرنده</span>
            <span className={s.infoVal}>{receiverName?.trim() || "—"}</span>
          </div>

          <div className={s.sep} aria-hidden />

          <div className={s.infoRow} role="listitem">
            <span className={s.infoKey}>روز و ساعت تحویل</span>
            <span className={s.infoVal}>{delivery?.trim() || "—"}</span>
          </div>
        </div>
      </main>

      {/* Bottom action bar */}
      <div className={s.ctaBar} role="region" aria-label="CTA">
        <div className={s.ctaBtn}>
          <Link href="/profile/orders">
            <Button type="primary" size="large" style="filled" fullWidth>
              مشاهده سفارش‌های من
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
