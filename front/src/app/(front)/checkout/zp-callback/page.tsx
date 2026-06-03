// src/app/(front)/checkout/zp-callback/ZarinpalCallback.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function readCookie(name: string) {
  try {
    return (
      document.cookie
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((entry) => entry.split("=", 2))
        .find(([key]) => key === name)?.[1] ?? ""
    );
  } catch {
    return "";
  }
}

async function fetchOrderTotalIrt(orderId: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "GET",
        cache: "no-store",
        credentials: "same-origin",
        signal: controller.signal,
      });
      if (!res.ok) return 0;
      const json = (await res.json().catch(() => ({}))) as any;
      const totalIrr = Number(json?.summary?.total || 0);
      if (!Number.isFinite(totalIrr) || totalIrr <= 0) return 0;
      return Math.round(totalIrr / 10);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return 0;
  }
}

async function verifyPaymentOnServer(body: {
  Authority: string;
  amount: number;
  orderId?: string;
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("/api/pay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ ...body, currency: "IRT" }),
      signal: controller.signal,
    });
    const json = (await response.json().catch(() => ({}))) as any;
    return { ok: response.ok, ...json };
  } finally {
    clearTimeout(timer);
  }
}

function clearFallbackCookies() {
  try {
    document.cookie = "kadochi_order_id=; Path=/; Max-Age=0; SameSite=Lax";
    document.cookie = "kadochi_pay_amount=; Path=/; Max-Age=0; SameSite=Lax";
  } catch {}
}

/**
 * ZarinpalCallback
 * - Reads Status/Authority from gateway callback.
 * - Verifies payment via /api/pay/verify.
 * - On success → redirects to /checkout/success?order={orderId}&paid={amount}
 * - On failure/cancel → redirects to /checkout/failure with reason.
 */
export default function ZarinpalCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    let cancelled = false;

    const run = async () => {
      const Authority = params.get("Authority") || "";
      const Status = params.get("Status") || "";

      console.log(
        "[zp-callback] callback received Authority=",
        Authority,
        "Status=",
        Status,
      );

      if (Status !== "OK" || !Authority) {
        console.warn("[zp-callback] cancelled by user or invalid status");
        if (!cancelled) router.replace("/checkout/failure?reason=cancelled");
        return;
      }

      const storedAmount = Number(
        (typeof window !== "undefined"
          ? window.sessionStorage.getItem("lastPayAmount")
          : "0") || "0"
      );
      const storedOrderId =
        (typeof window !== "undefined"
          ? window.sessionStorage.getItem("lastOrderId")
          : "") || "";

      const cookieOrder = decodeURIComponent(
        readCookie("kadochi_order_id") || ""
      );
      const cookieAmount = Number(readCookie("kadochi_pay_amount") || "0");

      const qsOrder = params.get("order") || "";

      let orderId = (storedOrderId || qsOrder || cookieOrder).trim();
      let amount =
        Number.isFinite(storedAmount) && storedAmount > 0 ? storedAmount : 0;

      if (!amount && Number.isFinite(cookieAmount) && cookieAmount > 0) {
        amount = cookieAmount;
      }

      console.log(
        "[zp-callback] resolved orderId=",
        orderId,
        "amount=",
        amount,
        "sources: storedAmount=",
        storedAmount,
        "cookieAmount=",
        cookieAmount,
        "qsOrder=",
        qsOrder,
      );

      if (!orderId) {
        console.error("[zp-callback] orderId missing, cannot verify");
        if (!cancelled)
          router.replace("/checkout/failure?reason=order-missing");
        return;
      }

      if (!amount) {
        console.log("[zp-callback] amount missing, fetching from Woo order");
        const derived = await fetchOrderTotalIrt(orderId);
        if (cancelled) return;
        amount = derived;
        console.log("[zp-callback] derived amount from Woo=", amount);
      }

      if (!amount) {
        console.error("[zp-callback] no amount available for verification");
        if (!cancelled)
          router.replace("/checkout/failure?reason=verify-failed");
        return;
      }

      console.log(
        "[zp-callback] verifying payment with /api/pay/verify authority=",
        Authority,
        "amount=",
        amount,
        "orderId=",
        orderId,
      );
      const verifyRes = await verifyPaymentOnServer({
        Authority,
        amount,
        orderId,
      });
      if (cancelled) return;

      console.log(
        "[zp-callback] verify result ok=",
        verifyRes?.ok,
        "paid=",
        verifyRes?.paid,
        "ref_id=",
        verifyRes?.ref_id,
      );

      if (!verifyRes?.ok || !verifyRes?.paid) {
        console.error("[zp-callback] payment verification failed");
        if (!cancelled)
          router.replace("/checkout/failure?reason=verify-failed");
        return;
      }

      try {
        sessionStorage.setItem("lastPayAmount", String(amount));
        sessionStorage.setItem("lastOrderId", orderId);
      } catch {}

      clearFallbackCookies();

      if (!/^\d+$/.test(orderId)) {
        if (!cancelled)
          router.replace("/checkout/failure?reason=order-missing");
        return;
      }

      const search = new URLSearchParams({
        order: orderId,
        paid: String(amount || 0),
      }).toString();

      if (!cancelled) router.replace(`/checkout/success?${search}`);

      if (orderId && verifyRes?.ref_id && !cancelled) {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 3_000);
        fetch(`/api/orders/${orderId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ref_id: verifyRes.ref_id,
            card_pan: verifyRes.card_pan || "",
          }),
          signal: ctl.signal,
        })
          .catch(() => {})
          .finally(() => clearTimeout(t));
      }
    };

    run().catch(() => {
      if (!cancelled) router.replace("/checkout/failure?reason=network");
    });

    return () => {
      cancelled = true;
    };
  }, [params, router]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 14, opacity: 0.7 }}>
        در حال نهایی‌سازی پرداخت…
      </div>
    </div>
  );
}
