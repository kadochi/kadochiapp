// src/app/(front)/checkout/zp-callback/ZarinpalCallback.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function readCookie(name: string) {
  try {
    return document.cookie
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((entry) => entry.split("=", 2))
      .find(([key]) => key === name)?.[1]
      ?? "";
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

      if (Status !== "OK" || !Authority) {
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

      const cookieOrder = decodeURIComponent(readCookie("kadochi_order_id") || "");
      const cookieAmount = Number(readCookie("kadochi_pay_amount") || "0");

      const qsOrder = params.get("order") || "";

      let orderId = (storedOrderId || qsOrder || cookieOrder).trim();
      let amount = Number.isFinite(storedAmount) && storedAmount > 0 ? storedAmount : 0;
      if (!amount && Number.isFinite(cookieAmount) && cookieAmount > 0) {
        amount = cookieAmount;
      }

      if (!orderId) {
        if (!cancelled) router.replace("/checkout/failure?reason=order-missing");
        return;
      }

      if (!amount) {
        const derived = await fetchOrderTotalIrt(orderId);
        if (cancelled) return;
        amount = derived;
      }

      if (!amount) {
        if (!cancelled) router.replace("/checkout/failure?reason=verify-failed");
        return;
      }

      const verifyRes = await verifyPaymentOnServer({ Authority, amount });
      if (cancelled) return;

      if (!verifyRes?.ok || !verifyRes?.paid) {
        if (!cancelled) router.replace("/checkout/failure?reason=verify-failed");
        return;
      }

      try {
        sessionStorage.setItem("lastPayAmount", String(amount));
        sessionStorage.setItem("lastOrderId", orderId);
      } catch {}

      clearFallbackCookies();

      if (!/^\d+$/.test(orderId)) {
        if (!cancelled) router.replace("/checkout/failure?reason=order-missing");
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
