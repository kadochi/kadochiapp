"use client";

/**
 * Checkout page
 * -----------------------------------------------------------------------------
 * - Multi-step checkout flow (sender/receiver → delivery/packaging → payment).
 * - Prices are fetched from Woo Store API to compute final totals.
 * - NEW: Payment step is only reachable after pricing is fully resolved,
 *   so amounts do not "jump" a few seconds after the payment screen shows.
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Divider from "@/components/ui/Divider/Divider";
import Button from "@/components/ui/Button/Button";
import Input from "@/components/ui/Input/Input";
import Checkbox from "@/components/ui/Checkbox/Checkbox";
import TextArea from "@/components/ui/TextArea/TextArea";
import ProgressStepper, {
  type StepItem,
} from "@/components/ui/ProgressStepper/ProgressStepper";
import Radio from "@/components/ui/Radio/Radio";
import { normalizeDigits } from "@/lib/utils/normalizeDigits";
import { useBasket } from "@/domains/basket/state/basket-context";
import s from "./Checkout.module.css";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import {
  DELIVERY_PARTS,
  type DeliveryPartKey,
  formatDeliveryWindow,
} from "@/domains/checkout/delivery-slot";
import { tryGetPublicWpBaseUrl } from "@/config/wp";

/* -------------------------------- Types & helpers -------------------------------- */

type PackagingId = "normal" | "gift";

type Slot = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  part: DeliveryPartKey;
  from: string;
  to: string;
  disabled?: boolean;
};

type StoreProduct = {
  id: number;
  name?: string;
  prices?: {
    price?: string | null;
    sale_price?: string | null;
    regular_price?: string | null;
  };
  // Store API often includes tags/taxonomies; we only care about presence, not shape.
  tags?: Array<{ id?: number; slug?: string; name?: string }>;
};

type ViewProduct = { id: number; prices?: StoreProduct["prices"] };

//const SHIPPING_IRT = 89_000;
const SHIPPING_IRT = 0;
const NORMAL_WRAP_IRT = 0;
const GIFT_WRAP_IRT = 0;
const TAX_RATE = 0.1;

const toman = (n: number) => n.toLocaleString("fa-IR");

function buildStepper(currentIndex: 0 | 1 | 2): StepItem[] {
  return [
    { label: "پرداخت", status: currentIndex === 2 ? "current" : "todo" },
    {
      label: "بسته‌بندی و ارسال",
      status:
        currentIndex > 0 ? (currentIndex === 2 ? "done" : "current") : "todo",
    },
    { label: "تکمیل اطلاعات", status: currentIndex === 0 ? "current" : "done" },
  ];
}

/** Debounced effect helper that keeps public behavior simple. */
function useDebouncedEffect(fn: () => void, deps: any[], ms: number) {
  useEffect(() => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const faDay = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });
const faDate = new Intl.DateTimeFormat("fa-IR", {
  day: "2-digit",
  month: "long",
});

const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

const isFriday = (d: Date) => d.getDay() === 5;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const priceFromWP = (p?: StoreProduct["prices"]) => {
  const raw = p?.sale_price ?? p?.price ?? p?.regular_price ?? "0";
  const n = Number(raw || 0);
  return Number.isFinite(n) ? n : 0;
};

const irrToIrt = (irr: number) => Math.round(Math.max(0, irr) / 10);
type FetchWithTimeoutInit = RequestInit & { timeoutMs?: number };

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: FetchWithTimeoutInit = {},
) {
  const { timeoutMs = 15_000, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let abortCleanup: (() => void) | undefined;

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    const onAbort = () => controller.abort(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    abortCleanup = () => signal.removeEventListener("abort", onAbort);
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    if (abortCleanup) abortCleanup();
  }
}

/**
 * Fetch products via Woo Store API.
 * - Tries proxy route first.
 * - Falls back to direct Store API if needed.
 * - Always returns a plain array; caller handles empty as "no prices".
 */
async function fetchProductsByIds(
  ids: string[],
  signal?: AbortSignal,
): Promise<StoreProduct[]> {
  if (!ids.length) return [];
  const qs = new URLSearchParams({
    include: ids.join(","),
    per_page: String(Math.min(50, ids.length)),
    orderby: "include",
  }).toString();

  try {
    const r = await fetch(`/api/wp/wp-json/wc/store/v1/products?${qs}`, {
      cache: "no-store",
      signal,
    });
    if (r.ok) {
      const data = (await r.json().catch(() => [])) as unknown;
      if (Array.isArray(data)) return data as StoreProduct[];
    }
  } catch {
    // Proxy path failed – fall back to direct Store API.
  }

  try {
    const base = tryGetPublicWpBaseUrl();
    if (!base) return [];

    const r2 = await fetch(`${base}/wp-json/wc/store/v1/products?${qs}`, {
      cache: "no-store",
      signal,
    });
    if (r2.ok) {
      const data = (await r2.json().catch(() => [])) as unknown;
      if (Array.isArray(data)) return data as StoreProduct[];
    }
  } catch {
    // Both paths failed – caller will see empty list and keep behavior graceful.
  }

  return [];
}

/* -------------------------------- Component -------------------------------- */

export default function CheckoutClient(props: {
  initialFirstName: string;
  initialLastName: string;
  phoneValue: string;
  userId: number;
}) {
  /* Step state (kept in-memory; not reset across steps) */
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const steps = useMemo(() => buildStepper(step), [step]);

  // تغییر اسکرول: هر بار استپ عوض شد اسکرول بره بالا
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  }, [step]);

  /* Basket → line items */
  const { basket } = useBasket();
  const basketIds = useMemo(
    () => Object.keys(basket || {}).filter(Boolean),
    [basket],
  );

  const lineItems = useMemo(
    () =>
      basketIds.map((id) => ({
        product_id: Number(id),
        quantity: Math.max(1, basket[id] || 1),
      })),
    [basketIds, basket],
  );

  /* Products for price calculation (Store API) */
  const [items, setItems] = useState<ViewProduct[]>([]);

  // NEW: pricing state so payment step only shows after totals are resolved.
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingReady, setPricingReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      if (!basketIds.length) {
        // Empty basket → nothing to price; keep behavior but mark as "ready".
        if (!cancelled) {
          setItems([]);
          setPricingLoading(false);
          setPricingReady(true);
        }
        return;
      }

      if (!cancelled) {
        setPricingLoading(true);
        setPricingReady(false);
      }

      try {
        const arr = await fetchProductsByIds(basketIds, ac.signal);
        if (cancelled) return;

        const idSet = new Set(basketIds.map(String));
        const mapped: ViewProduct[] = (arr || [])
          .filter((p) => idSet.has(String(p?.id)))
          .map((p) => ({ id: p.id, prices: p.prices }));

        setItems(mapped);
      } finally {
        // Even on error we mark as "ready", so behavior stays compatible
        // with previous logic (totals may be 0, but the flow is not blocked).
        if (!cancelled) {
          setPricingLoading(false);
          setPricingReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketIds.join(",")]);

  /* Sender / Receiver (controlled state; persists across steps) */
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

  const canNext0 = validSender && validReceiver && lineItems.length > 0;

  /* Packaging & Delivery */
  // پیش‌فرض: بسته‌بندی کادویی
  const [packId, setPackId] = useState<PackagingId>("gift");
  const [allFast, setAllFast] = useState(false);

  // Best-effort "fast-delivery" tag check via Store API.
  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();

    (async () => {
      if (!basketIds.length) {
        if (!cancelled) setAllFast(false);
        return;
      }
      try {
        const arr = await fetchProductsByIds(basketIds, ac.signal);
        if (cancelled) return;

        const FAST_SET = new Set(
          [
            "fast",
            "fast-deliver",
            "fast-delivery",
            "ارسال سریع",
            "ارسال-سریع",
          ].map((s) => s.toLowerCase().trim()),
        );

        const ok =
          Array.isArray(arr) &&
          arr.length === basketIds.length &&
          arr.every((p) => {
            const tags = Array.isArray(p?.tags) ? p.tags : [];
            return tags.some((t) => {
              const slug = String(t?.slug ?? "")
                .toLowerCase()
                .trim();
              const name = String(t?.name ?? "")
                .toLowerCase()
                .trim();
              return FAST_SET.has(slug) || FAST_SET.has(name);
            });
          });

        if (!cancelled) setAllFast(!!ok);
      } catch {
        if (!cancelled) setAllFast(false);
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketIds.join(",")]);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");

  // Build 9 slots starting today (if fast) or tomorrow.
  useEffect(() => {
    const now = new Date();
    const startFromToday = allFast === true;
    let dayCursor = startFromToday ? new Date(now) : addDays(now, 1);

    const out: Slot[] = [];
    for (let dayIdx = 0; out.length < 9 && dayIdx < 6; dayIdx++) {
      if (isFriday(dayCursor)) {
        dayCursor = addDays(dayCursor, 1);
        continue;
      }
      for (const p of DELIVERY_PARTS) {
        if (out.length >= 9) break;
        let disabled = false;
        if (sameDay(dayCursor, now)) {
          const h = now.getHours();
          disabled = h >= p.fromHour;
        }
        out.push({
          id: `${dayCursor.toISOString().slice(0, 10)}_${p.key}`,
          dayLabel: faDay.format(dayCursor),
          dateLabel: faDate.format(dayCursor),
          part: p.key,
          from: p.fromLabel,
          to: p.toLabel,
          disabled,
        });
      }
      dayCursor = addDays(dayCursor, 1);
    }

    while (out.length < 9) {
      if (isFriday(dayCursor)) {
        dayCursor = addDays(dayCursor, 1);
        continue;
      }
      for (const p of DELIVERY_PARTS) {
        if (out.length >= 9) break;
        out.push({
          id: `${dayCursor.toISOString().slice(0, 10)}_${p.key}`,
          dayLabel: faDay.format(dayCursor),
          dateLabel: faDate.format(dayCursor),
          part: p.key,
          from: p.fromLabel,
          to: p.toLabel,
          disabled: false,
        });
      }
      dayCursor = addDays(dayCursor, 1);
    }

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

  /* Totals (dynamic; driven by Store API prices + current basket) */
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

  /* Step navigation */
  const goNext = () => setStep((p) => (p < 2 ? ((p + 1) as 0 | 1 | 2) : p));
  const goPrev = () => setStep((p) => (p > 0 ? ((p - 1) as 0 | 1 | 2) : p));

  /* Submit (create Woo order → start Zarinpal) */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [cardMessage, setCardMessage] = useState("");

  const buildPayload = () => ({
    sender: {
      firstName: senderFirst.trim(),
      lastName: senderLast.trim(),
      phone: senderPhone,
    },
    receiver: {
      isSelf: receiverIsMe,
      name: recName.trim(),
      phone: normalizeDigits(recPhone.trim()),
      address: recAddress.trim(),
    },
    items: lineItems,
    delivery: {
      slot_id: selectedSlotId,
      fast_delivery: allFast,
      label: formatDeliveryWindow(selectedSlotId) || "",
    },
    packaging: { type: packId, postcard_message: cardMessage.trim() },
    amounts: {
      subtotal_irt: subtotalIRT,
      tax_irt: taxIRT,
      shipping_irt: shippingIRT,
      packaging_irt: packagingIRT,
      total_irt: totalIRT,
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

  /* -------------------------------- UI -------------------------------- */

  return (
    <div>
      {/* Stepper */}
      <div className={s.stepper}>
        <ProgressStepper steps={steps} showIndex={false} />
      </div>

      {/* ===================== STEP 0: Sender & Receiver ===================== */}
      {step === 0 && (
        <>
          <SectionHeader
            title="مشخصات فرستنده"
            subtitle="اطلاعات فرستنده سفارش"
            labelSlot={
              savingProfile ? (
                <span className={s.savingHint} aria-live="polite"></span>
              ) : null
            }
          />
          <section className={s.section} aria-labelledby="sender">
            <div className={s.grid2}>
              <Input
                label="نام"
                value={senderFirst}
                onChange={(e) => setSenderFirst(e.currentTarget.value)}
                onBlur={onSenderBlur}
                required
              />
              <Input
                label="نام خانوادگی"
                value={senderLast}
                onChange={(e) => setSenderLast(e.currentTarget.value)}
                onBlur={onSenderBlur}
                required
              />
            </div>
            <div className={s.mt12}>
              <Input
                label="شماره موبایل"
                value={senderPhone}
                disabled
                dir="ltr"
                showMessage
                messageType="hint"
                message="شماره موبایل شما از حساب کاربری خوانده شده و قابل ویرایش نیست."
                required
              />
            </div>
          </section>

          <Divider type="spacer" />

          <SectionHeader
            title="مشخصات گیرنده"
            subtitle="اطلاعات تحویل گیرنده سفارش"
            leftSlot={
              <Checkbox
                label="گیرنده خودم هستم"
                checked={receiverIsMe}
                onChange={setReceiverIsMe}
                className={s.headerCheck}
              />
            }
          />
          <section className={s.section} aria-labelledby="receiver">
            {!receiverIsMe && (
              <div className={s.grid2}>
                <Input
                  label="نام و نام خانوادگی گیرنده"
                  value={recName}
                  onChange={(e) => setRecName(e.currentTarget.value)}
                  required
                />
                <Input
                  label="شماره موبایل گیرنده"
                  value={recPhone}
                  onChange={(e) => setRecPhone(e.currentTarget.value)}
                  inputMode="numeric"
                  autoComplete="tel"
                  dir="ltr"
                  required
                />
              </div>
            )}
          </section>

          <Divider type="spacer" />

          <SectionHeader
            title="آدرس دریافت سفارش"
            subtitle="نشانی که کادو به آن ارسال می‌شود."
          />
          <section className={s.section} aria-labelledby="address">
            <div className={s.mt12}>
              <Input
                label="انتخاب شهر"
                value="تهران"
                disabled
                dir="rtl"
                showMessage
                required
                messageType="hint"
                message="در حال حاضر کادوچی فقط در شهر تهران فعال است."
              />
            </div>
            <div className={s.mt12}>
              <TextArea
                label="آدرس گیرنده"
                rows={4}
                value={recAddress}
                onChange={(e) => setRecAddress(e.currentTarget.value)}
                required
                showCounter
                maxLength={280}
                placeholder="خیابان، کوچه، پلاک، واحد…"
              />
            </div>
          </section>

          <div className={s.nav}>
            <div className={s.navRow}>
              <Button
                as="button"
                type="primary"
                style="filled"
                size="large"
                fullWidth
                disabled={!canNext0}
                onClick={goNext}
              >
                مرحله بعد
              </Button>
            </div>
          </div>
          <div style={{ height: 96 }} />
        </>
      )}

      {/* ===================== STEP 1: Packaging & Delivery ===================== */}
      {step === 1 && (
        <>
          <SectionHeader
            title="انتخاب زمان دریافت"
            subtitle="بازه زمانی تحویل را انتخاب کنید."
          />
          <section className={s.sectionTight} aria-labelledby="delivery">
            <Swiper
              dir="rtl"
              className={s.slotSwiper}
              slidesPerView={3.2}
              spaceBetween={16}
              slidesOffsetBefore={16}
              slidesOffsetAfter={16}
              loop={false}
              centeredSlides={false}
              centerInsufficientSlides={false}
              watchOverflow={true}
            >
              {slots.map((sl) => {
                const selected = selectedSlotId === sl.id;
                const disabled = !!sl.disabled;
                return (
                  <SwiperSlide key={sl.id} className={s.slotSlide}>
                    <button
                      type="button"
                      className={`${s.slotCard} ${
                        selected ? s.slotCardSelected : ""
                      } ${disabled ? s.slotDisabled : ""}`}
                      onClick={() => !disabled && setSelectedSlotId(sl.id)}
                      aria-pressed={selected}
                      aria-disabled={disabled || undefined}
                      disabled={disabled}
                    >
                      <div className={s.slotDay}>{sl.dayLabel}</div>
                      <div className={s.slotDate}>{sl.dateLabel}</div>
                      <div className={s.slotPart}>{sl.part}</div>
                      <div className={s.slotRange}>
                        {sl.from} الی {sl.to}
                      </div>
                    </button>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </section>

          <Divider type="spacer" />

          <SectionHeader
            title="انتخاب نوع بسته‌بندی"
            subtitle="بسته‌بندی سفارش خود را انتخاب کنید"
          />
          <section className={s.section} aria-labelledby="pack">
            <div className={s.packGrid}>
              {(["gift", "normal"] as PackagingId[]).map((id) => {
                const active = id === packId;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`${s.packCard} ${
                      active ? s.packCardActive : ""
                    }`}
                    onClick={() => setPackId(id)}
                    aria-pressed={active}
                  >
                    <img
                      src={
                        id === "gift"
                          ? "/images/special-pack.png"
                          : "/images/normal-pack.png"
                      }
                      alt=""
                      className={s.packImg}
                    />
                    <div className={s.packTitle}>
                      {id === "gift" ? "بسته‌بندی کادویی" : "بسته‌بندی عادی"}
                    </div>
                    <div className={s.packDesc}>
                      {id === "gift"
                        ? "کاغذ کادو، روبان، پوشال و کارت"
                        : "جعبه مقوایی پستی"}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <Divider type="spacer" />

          <SectionHeader
            title="متن کارت پستال"
            subtitle="یک پیام کوتاه برای قرار گرفتن داخل کادو"
          />
          <section className={s.section} aria-labelledby="postcard">
            <TextArea
              label="متن کارت پستال"
              rows={4}
              value={cardMessage}
              onChange={(e) => setCardMessage(e.currentTarget.value)}
              showCounter
              maxLength={220}
              placeholder="پیام شما…"
            />
          </section>

          <div className={s.navTwo}>
            <Button
              as="button"
              size="large"
              type="primary"
              style="filled"
              // NEW: prevent moving to payment step until pricing is resolved.
              disabled={!canNext1 || pricingLoading || !pricingReady}
              onClick={goNext}
              className={s.nextBtn}
              fullWidth
            >
              {pricingLoading ? "در حال محاسبه مبلغ سفارش…" : "مرحله بعد"}
            </Button>
            <Button
              as="button"
              type="tertiary"
              style="outline"
              onClick={goPrev}
              size="large"
              className={s.backBtn}
            >
              مرحله قبل
            </Button>
          </div>
          <div style={{ height: 96 }} />
        </>
      )}

      {/* ===================== STEP 2: Payment ===================== */}
      {step === 2 && (
        <>
          <SectionHeader title="شیوه پرداخت" />
          <section className={s.section}>
            <button
              type="button"
              className={`${s.payCard} ${s.payCardActive}`}
              aria-pressed
            >
              <div className={s.payCardInner}>
                <Radio name="pay-method" defaultChecked />
                <div>
                  <div className={s.payTitle}>پرداخت آنلاین</div>
                  <div className={s.paySubtitle}>
                    از طریق درگاه پرداخت الکترونیک
                  </div>
                </div>
              </div>
            </button>
          </section>

          <Divider type="spacer" />

          <div className={s.sectionHeaderOnly}>
            <SectionHeader
              title="جزئیات پرداخت"
              subtitle="مشخصات هزینه‌های سفارش"
            />
          </div>
          <div className={s.kvWrap}>
            <div className={s.detailRow}>
              <div className={s.detailKey}>جمع سفارش‌ها</div>
              <div className={s.detailVal}>{toman(subtotalIRT)} تومان</div>
            </div>
            <Divider />
            <div className={s.detailRow}>
              <div className={s.detailKey}>۱۰٪ مالیات بر ارزش افزوده</div>
              <div className={s.detailVal}>{toman(taxIRT)} تومان</div>
            </div>
            <Divider />
            <div className={s.detailRow}>
              <div className={s.detailKey}>هزینه ارسال</div>
              <div className={s.detailVal}>{toman(shippingIRT)} تومان</div>
            </div>
            <Divider />
            <div className={s.detailRow}>
              <div className={s.detailKey}>هزینه بسته‌بندی و خدمات</div>
              <div className={s.detailVal}>{toman(packagingIRT)} تومان</div>
            </div>
            <Divider />
            <div className={s.detailRow}>
              <div className={s.detailKey}>جمع کل</div>
              <div className={s.detailValBold}>{toman(totalIRT)} تومان</div>
            </div>
          </div>

          <div className={s.navPay}>
            {submitError ? <div className={s.error}>{submitError}</div> : null}
            <div className={s.payRow}>
              <Button
                as="button"
                type="primary"
                style="filled"
                size="large"
                onClick={handlePay}
                disabled={submitting}
                loading={submitting}
                className={s.nextBtn}
                fullWidth
              >
                {submitting ? "در حال انتقال…" : "پرداخت"}
              </Button>
              <Button
                as="button"
                type="tertiary"
                style="outline"
                size="large"
                onClick={goPrev}
                className={s.backBtn}
              >
                مرحله قبل
              </Button>
            </div>
          </div>
          <div style={{ height: 96 }} />
        </>
      )}
    </div>
  );
}
