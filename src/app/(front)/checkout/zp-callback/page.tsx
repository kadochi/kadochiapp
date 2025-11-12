"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// Lightweight processing screen. We keep it minimal and fast.
export default function ZarinpalCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;

    const Authority = params.get("Authority") || "";
    const Status = params.get("Status") || "";

    // If user cancels at gateway, route to failure (cancelled)
    if (Status !== "OK" || !Authority) {
      router.replace("/checkout/failure?reason=cancelled");
      return;
    }

    // Read back amount/order from the session
    const amount = Number(sessionStorage.getItem("lastPayAmount") || "0");
    const orderId = sessionStorage.getItem("lastOrderId") || "";

    fetch("/api/pay/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ Authority, amount, currency: "IRT" }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (!res?.ok || !res?.paid) {
          router.replace("/checkout/failure?reason=verify-failed");
          return;
        }

        // Success → go success page
        router.replace(`/checkout/success?order=${orderId}`);

        // Best-effort: notify backend about ref_id/card
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
            .catch(() => {})
            .finally(() => clearTimeout(t));
        }
      })
      .catch(() => router.replace("/checkout/failure?reason=network"));
  }, [params, router]);

  return (
    <div style={{ padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 14, opacity: 0.7 }}>
        در حال نهایی‌سازی پرداخت…
      </div>
    </div>
  );
}
