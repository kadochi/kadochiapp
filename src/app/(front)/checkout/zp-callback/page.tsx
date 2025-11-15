// src/app/(front)/checkout/zp-callback/ZarinpalCallback.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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
    // Prevent double-run in React strict mode / re-mounts
    if (doneRef.current) return;
    doneRef.current = true;

    const Authority = params.get("Authority") || "";
    const Status = params.get("Status") || "";

    // User canceled or gateway didn't return proper params
    if (Status !== "OK" || !Authority) {
      router.replace("/checkout/failure?reason=cancelled");
      return;
    }

    // Best-effort restore from sessionStorage or querystring fallback
    const storedAmount = Number(
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem("lastPayAmount")
        : "0") || "0"
    );

    const storedOrderId =
      (typeof window !== "undefined"
        ? window.sessionStorage.getItem("lastOrderId")
        : "") || "";

    // Optional: if we ever pass ?order=... in callback URL itself, support it
    const qsOrder = params.get("order") || "";

    // Also try cookie fallback set before redirect
    let cookieOrder = "";
    try {
      const m = document.cookie
        .split(";")
        .map((s) => s.trim())
        .find((c) => c.startsWith("kadochi_order_id="));
      cookieOrder = m ? decodeURIComponent(m.split("=", 2)[1] || "") : "";
    } catch {}

    const orderId = (storedOrderId || qsOrder || cookieOrder).trim();
    const amount = Number.isFinite(storedAmount) ? storedAmount : 0;

    fetch("/api/pay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ Authority, amount, currency: "IRT" }),
    })
      .then(async (r) => {
        const json = await r.json().catch(() => ({}));
        return { ok: r.ok, ...json };
      })
      .then((res) => {
        if (!res?.ok || !res?.paid) {
          router.replace("/checkout/failure?reason=verify-failed");
          return;
        }

        if (!orderId || !/^\d+$/.test(orderId)) {
          router.replace("/checkout/failure?reason=order-missing");
          return;
        }

        // Successful payment → go to success page with order and paid amount
        const search = new URLSearchParams({
          order: orderId,
          paid: String(amount || 0),
        }).toString();

        router.replace(`/checkout/success?${search}`);

        // Fire-and-forget: notify backend with ref_id/card_pan if available
        if (orderId && res?.ref_id) {
          const ctl = new AbortController();
          const t = setTimeout(() => ctl.abort(), 3000);

          fetch(`/api/orders/${orderId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ref_id: res.ref_id,
              card_pan: res.card_pan || "",
            }),
            signal: ctl.signal,
          })
            .catch(() => {
              // Ignore any errors here – this is best-effort logging.
            })
            .finally(() => clearTimeout(t));
        }
      })
      .catch(() => {
        router.replace("/checkout/failure?reason=network");
      });
  }, [params, router]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 14, opacity: 0.7 }}>
        در حال نهایی‌سازی پرداخت…
      </div>
    </div>
  );
}
