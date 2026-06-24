"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import Lottie from "lottie-react";
import Button from "@/components/ui/Button/Button";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import { useBasket } from "@/modules/basket/context/basket-context";
import ConfettiAnim from "@/assets/Celebration.json";
import { cn } from "@/lib/cn";

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
    <div className={cn("relative mx-auto bg-white mb-32")} dir="rtl">
      <div className={cn("fixed inset-0 h-full w-full pointer-events-none z-[2000]")} aria-hidden>
        <Lottie
          animationData={ConfettiAnim}
          loop
          autoplay
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      <main className={cn("px-6 max-w-[580px] mx-auto text-center")}>
        <StateMessage
          imageSrc="/images/success-illustration.png"
          imageAlt=""
          title="سفارش شما ثبت شد!"
          subtitle="می‌توانید وضعیت سفارش را در بخش سفارش‌های من دنبال کنید."
        />

        <div className={cn("mt-6")} role="list">
          <div className={cn("grid grid-cols-[1fr_auto] items-center gap-3 text-start px-4")} role="listitem">
            <span className={cn("justify-self-start text-base text-text-secondary")}>مبلغ پرداخت‌شده</span>
            <span className={cn("justify-self-end text-base text-text-primary font-bold")}>{toman(paidIRT)} تومان</span>
          </div>

          <div className={cn("border-t border-dashed border-border-low mx-4 my-4")} aria-hidden />

          <div className={cn("grid grid-cols-[1fr_auto] items-center gap-3 text-start px-4")} role="listitem">
            <span className={cn("justify-self-start text-base text-text-secondary")}>شماره سفارش</span>
            <span className={cn("justify-self-end text-base text-text-primary font-bold")}>{orderId ? `#${orderId}` : "—"}</span>
          </div>

          <div className={cn("border-t border-dashed border-border-low mx-4 my-4")} aria-hidden />

          <div className={cn("grid grid-cols-[1fr_auto] items-center gap-3 text-start px-4")} role="listitem">
            <span className={cn("justify-self-start text-base text-text-secondary")}>تاریخ سفارش</span>
            <span className={cn("justify-self-end text-base text-text-primary font-bold")}>{orderDateText}</span>
          </div>

          <div className={cn("border-t border-dashed border-border-low mx-4 my-4")} aria-hidden />

          <div className={cn("grid grid-cols-[1fr_auto] items-center gap-3 text-start px-4")} role="listitem">
            <span className={cn("justify-self-start text-base text-text-secondary")}>گیرنده</span>
            <span className={cn("justify-self-end text-base text-text-primary font-bold")}>{receiverName?.trim() || "—"}</span>
          </div>

          <div className={cn("border-t border-dashed border-border-low mx-4 my-4")} aria-hidden />

          <div className={cn("grid grid-cols-[1fr_auto] items-center gap-3 text-start px-4")} role="listitem">
            <span className={cn("justify-self-start text-base text-text-secondary")}>روز و ساعت تحویل</span>
            <span className={cn("justify-self-end text-base text-text-primary font-bold")}>{delivery?.trim() || "—"}</span>
          </div>
        </div>
      </main>

      <div className={cn("fixed left-0 right-0 bottom-0 p-4 pb-8 bg-white border-t border-border-mid grid z-[9999]")} role="region" aria-label="CTA">
        <div className={cn("w-full max-w-[580px] mx-auto")}>
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
