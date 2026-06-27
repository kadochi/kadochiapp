"use client";

/**
 * Checkout stateful hooks
 * -----------------------------------------------------------------------------
 * Sender/receiver form, delivery-slot selection, totals, and order submission.
 * Extracted verbatim from CheckoutClient (no behavior change).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { normalizeDigits } from "@/lib/utils/normalizeDigits";
import { formatDeliveryWindow } from "@/domains/checkout/delivery-slot";
import {
  buildSlots,
  fetchWithTimeout,
  irrToIrt,
  priceFromWP,
  type PackagingId,
  type Slot,
  type ViewProduct,
  GIFT_WRAP_IRT,
  NORMAL_WRAP_IRT,
  SHIPPING_IRT,
  TAX_RATE,
} from "./checkout.helpers";

/** Debounced effect helper that keeps public behavior simple. */
export function useDebouncedEffect(fn: () => void, deps: unknown[], ms: number) {
  useEffect(() => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* -------------------------------- Sender / Receiver -------------------------------- */

export function useSenderReceiver(props: {
  initialFirstName: string;
  initialLastName: string;
  phoneValue: string;
}) {
  const [senderFirst, setSenderFirst] = useState(props.initialFirstName || "");
  const [senderLast, setSenderLast] = useState(props.initialLastName || "");
  const [senderPhone, setSenderPhone] = useState(
    normalizeDigits((props.phoneValue || "").trim()),
  );

  useEffect(() => {
    // Keep initial values in sync, but never wipe user input.
    setSenderFirst((v) => (v ? v : props.initialFirstName || ""));
    setSenderLast((v) => (v ? v : props.initialLastName || ""));
    setSenderPhone(normalizeDigits((props.phoneValue || "").trim()));
  }, [props.initialFirstName, props.initialLastName, props.phoneValue]);

  const [savingProfile, setSavingProfile] = useState(false);
  const saveProfile = useCallback(
    async (first: string, last: string) => {
      const f = first.trim();
      const l = last.trim();
      if (!f || !l) return;
      try {
        setSavingProfile(true);
        await fetch("/api/profile/update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/plain, */*",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({
            first_name: f,
            last_name: l,
            phone: senderPhone,
          }),
        });
      } finally {
        setSavingProfile(false);
      }
    },
    [senderPhone],
  );

  useDebouncedEffect(
    () => {
      // Background profile save – non-blocking, no UX change.
      void saveProfile(senderFirst, senderLast);
    },
    [senderFirst, senderLast, saveProfile],
    600,
  );
  const onSenderBlur = () => void saveProfile(senderFirst, senderLast);

  const [receiverIsMe, setReceiverIsMe] = useState(false);
  const [recName, setRecName] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recAddress, setRecAddress] = useState("");

  useEffect(() => {
    // Mirror sender into receiver when "receiver is me" is checked.
    if (receiverIsMe) {
      setRecName(`${senderFirst} ${senderLast}`.trim());
      setRecPhone(senderPhone);
    }
  }, [receiverIsMe, senderFirst, senderLast, senderPhone]);

  const phoneRe = /^09\d{9}$/;
  const normalizedRecPhone = normalizeDigits((recPhone || "").trim());
  const validSender =
    senderFirst.trim().length >= 2 && senderLast.trim().length >= 2;
  const validReceiver = receiverIsMe
    ? recAddress.trim().length >= 5
    : recName.trim().length >= 2 &&
      phoneRe.test(normalizedRecPhone) &&
      recAddress.trim().length >= 5;

  return {
    senderFirst,
    setSenderFirst,
    senderLast,
    setSenderLast,
    senderPhone,
    savingProfile,
    onSenderBlur,
    receiverIsMe,
    setReceiverIsMe,
    recName,
    setRecName,
    recPhone,
    setRecPhone,
    recAddress,
    setRecAddress,
    validSender,
    validReceiver,
  };
}

/* -------------------------------- Delivery slots -------------------------------- */

export function useDeliverySlots(allFast: boolean) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");

  useEffect(() => {
    const out = buildSlots(allFast);
    setSlots(out);
    const firstEnabled = out.find((s) => !s.disabled);
    setSelectedSlotId((prev) =>
      prev && out.some((s) => s.id === prev && !s.disabled)
        ? prev
        : firstEnabled?.id || out[0]?.id || "",
    );
  }, [allFast]);

  const canNext1 = Boolean(
    selectedSlotId && slots.some((s) => s.id === selectedSlotId && !s.disabled),
  );

  return { slots, selectedSlotId, setSelectedSlotId, canNext1 };
}

/* -------------------------------- Totals -------------------------------- */

export function useCheckoutTotals(
  items: ViewProduct[],
  basket: Record<string, number>,
  packId: PackagingId,
) {
  const subtotalIRR = useMemo(() => {
    const byId = new Map(items.map((p) => [String(p.id), p]));
    return Object.entries(basket || {}).reduce((sum, [id, qty]) => {
      const prod = byId.get(String(id));
      const price = prod ? priceFromWP(prod.prices) : 0;
      return sum + price * (qty || 0);
    }, 0);
  }, [items, basket]);

  const subtotalIRT = irrToIrt(subtotalIRR);
  const taxIRT = Math.round(subtotalIRT * TAX_RATE);
  const shippingIRT = SHIPPING_IRT;

  // مبلغ بسته‌بندی بر اساس نوع انتخاب‌شده
  const packagingIRT =
    packId === "gift"
      ? GIFT_WRAP_IRT
      : packId === "normal"
        ? NORMAL_WRAP_IRT
        : 0;

  const totalIRT = Math.max(
    0,
    subtotalIRT + taxIRT + shippingIRT + packagingIRT,
  );

  return { subtotalIRT, taxIRT, shippingIRT, packagingIRT, totalIRT };
}

/* -------------------------------- Submit -------------------------------- */

type LineItem = { product_id: number; quantity: number };

export type CheckoutSubmitArgs = {
  senderFirst: string;
  senderLast: string;
  senderPhone: string;
  receiverIsMe: boolean;
  recName: string;
  recPhone: string;
  recAddress: string;
  lineItems: LineItem[];
  selectedSlotId: string;
  allFast: boolean;
  packId: PackagingId;
  cardMessage: string;
  subtotalIRT: number;
  taxIRT: number;
  shippingIRT: number;
  packagingIRT: number;
  totalIRT: number;
};

export function useCheckoutSubmit(args: CheckoutSubmitArgs) {
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const buildPayload = () => ({
    sender: {
      firstName: args.senderFirst.trim(),
      lastName: args.senderLast.trim(),
      phone: args.senderPhone,
    },
    receiver: {
      isSelf: args.receiverIsMe,
      name: args.recName.trim(),
      phone: normalizeDigits(args.recPhone.trim()),
      address: args.recAddress.trim(),
    },
    items: args.lineItems,
    delivery: {
      slot_id: args.selectedSlotId,
      fast_delivery: args.allFast,
      label: formatDeliveryWindow(args.selectedSlotId) || "",
    },
    packaging: { type: args.packId, postcard_message: args.cardMessage.trim() },
    amounts: {
      subtotal_irt: args.subtotalIRT,
      tax_irt: args.taxIRT,
      shipping_irt: args.shippingIRT,
      packaging_irt: args.packagingIRT,
      total_irt: args.totalIRT,
    },
  });

  async function handlePay() {
    setSubmitError("");
    setSubmitting(true);

    const payload = buildPayload();
    if (!payload.items.length) {
      setSubmitError("سبد خرید شما خالی است.");
      setSubmitting(false);
      return;
    }
    if (!payload.delivery.slot_id) {
      setSubmitError("لطفاً بازه تحویل را انتخاب کنید.");
      setSubmitting(false);
      return;
    }

    let redirected = false;

    try {
      const checkoutPayload = {
        items: payload.items,
        sender: {
          firstName: payload.sender.firstName,
          lastName: payload.sender.lastName,
          phone: payload.sender.phone,
        },
        receiver: {
          isSelf: payload.receiver.isSelf,
          name: payload.receiver.name,
          phone: payload.receiver.phone,
          address: payload.receiver.address,
        },
        figures: {
          subtotal: payload.amounts.subtotal_irt,
          tax: payload.amounts.tax_irt,
          discount: 0,
          total: payload.amounts.total_irt,
          shipping: payload.amounts.shipping_irt,
          packaging: payload.amounts.packaging_irt,
        },
        delivery: {
          slot_id: payload.delivery.slot_id,
          label: payload.delivery.label,
        },
        packaging: {
          id: payload.packaging.type,
          postcard_message: payload.packaging.postcard_message,
        },
        payMethod: "online",
      };

      console.log(
        "[CheckoutClient/handlePay] submitting order items=",
        checkoutPayload.items.length,
        "total=",
        checkoutPayload.figures.total,
      );

      const res = await fetchWithTimeout("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "same-origin",
        body: JSON.stringify(checkoutPayload),
      });

      type CheckoutStartResponse = {
        ok: boolean;
        error?: string;
        redirectUrl?: string;
        orderId?: number;
        amount?: number;
      };
      const data = (await res
        .json()
        .catch(() => ({}))) as CheckoutStartResponse;

      console.log(
        "[CheckoutClient/handlePay] response status=",
        res.status,
        "ok=",
        data?.ok,
        "orderId=",
        data?.orderId,
        "redirectUrl=",
        data?.redirectUrl,
      );

      if (!res.ok || !data?.ok || !data?.redirectUrl) {
        throw new Error(data?.error || "checkout_start_failed");
      }

      try {
        sessionStorage.setItem("lastPayAmount", String(data.amount));
        sessionStorage.setItem("lastOrderId", String(data.orderId));
        document.cookie = `kadochi_order_id=${encodeURIComponent(
          String(data.orderId),
        )}; Path=/; Max-Age=900; SameSite=Lax`;
        document.cookie = `kadochi_pay_amount=${encodeURIComponent(
          String(data.amount),
        )}; Path=/; Max-Age=900; SameSite=Lax`;
      } catch {
        // sessionStorage may be unavailable; ignore.
      }

      console.log(
        "[CheckoutClient/handlePay] redirecting to Zarinpal gateway:",
        data.redirectUrl,
      );
      window.location.href = String(data.redirectUrl);
      redirected = true;
    } catch (e: unknown) {
      const err = e instanceof Error ? e : undefined;
      const aborted = err?.name === "AbortError";
      console.error("[CheckoutClient/handlePay] error:", err?.message || e);
      const msg = aborted
        ? "فرایند طولانی شد. لطفاً دوباره تلاش کنید."
        : err?.message === "checkout_start_failed"
          ? "در ایجاد سفارش یا اتصال به درگاه خطا رخ داد. لطفاً دوباره تلاش کنید."
          : err?.message || "خطا در اتصال به درگاه پرداخت.";
      setSubmitError(msg);
    } finally {
      if (!redirected) setSubmitting(false);
    }
  }

  return { submitting, submitError, handlePay };
}
