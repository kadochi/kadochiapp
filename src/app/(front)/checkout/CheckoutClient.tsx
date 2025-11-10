"use client";

/**
 * Checkout page – payment step updates:
 * - Progress stepper shows "پرداخت" as current (not done).
 * - Payment method uses your <Radio> component inside a selectable card.
 * - Payment summary styled like Order Detail kv list (key/value with dividers).
 * - Zarinpal fallback wired via /api/pay/start if /api/checkout/start isn't available.
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
import s from "./Checkout.module.css";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { useBasket } from "@/domains/basket/state/basket-context";

/* ---------- Types ---------- */
type Slot = {
  id: string;
  dayLabel: string;
  dateLabel: string;
  part: "صبح" | "ظهر" | "عصر";
  from: string;
  to: string;
  disabled?: boolean;
};
type PackagingId = "normal" | "gift";

/* ---------- Consts ---------- */
const SHIPPING_IRT = 120_000;
const GIFT_WRAP_IRT = 80_000;

/** Build stepper so that at step=2 only "پرداخت" is current (no check). */
function buildStepper(currentIndex: 0 | 1 | 2): StepItem[] {
  return [
    {
      label: "پرداخت",
      status: currentIndex === 2 ? "current" : "todo",
    },
    {
      label: "بسته‌بندی و ارسال",
      status:
        currentIndex > 0 ? (currentIndex === 2 ? "done" : "current") : "todo",
    },
    { label: "تکمیل اطلاعات", status: currentIndex === 0 ? "current" : "done" },
  ];
}
const toman = (n: number) => n.toLocaleString("fa-IR");

/* debounce helper */
function useDebouncedEffect(fn: () => void, deps: any[], ms: number) {
  useEffect(() => {
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ---------- Date utils for slots ---------- */
const PARTS = [
  { part: "صبح" as const, from: 10, to: 13, fa: ["۱۰", "۱۳"] },
  { part: "ظهر" as const, from: 13, to: 16, fa: ["۱۳", "۱۶"] },
  { part: "عصر" as const, from: 16, to: 19, fa: ["۱۶", "۱۹"] },
];
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

export default function CheckoutClient(props: {
  initialFirstName: string;
  initialLastName: string;
  phoneValue: string;
  userId: number;
}) {
  /* ---------- STEP STATE ---------- */
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const steps = useMemo(() => buildStepper(step), [step]);

  /* ---------- Basket ---------- */
  const { basket } = useBasket();
  const basketIds = useMemo(() => Object.keys(basket || {}), [basket]);
  const lineItems = useMemo(
    () =>
      basketIds.map((id) => ({
        product_id: Number(id),
        quantity: Math.max(1, basket[id] || 1),
      })),
    [basketIds, basket]
  );

  /* ---------- SENDER / RECEIVER ---------- */
  const [senderFirst, setSenderFirst] = useState(props.initialFirstName || "");
  const [senderLast, setSenderLast] = useState(props.initialLastName || "");
  const [senderPhone, setSenderPhone] = useState(
    normalizeDigits((props.phoneValue || "").trim())
  );

  useEffect(() => {
    setSenderFirst((v) => (v ? v : props.initialFirstName || ""));
    setSenderLast((v) => (v ? v : props.initialLastName || ""));
    setSenderPhone(normalizeDigits((props.phoneValue || "").trim()));
  }, [props.initialFirstName, props.initialLastName, props.phoneValue]);

  const [savingProfile, setSavingProfile] = useState(false);
  const saveProfile = useCallback(
    async (first: string, last: string) => {
      const f = first.trim(),
        l = last.trim();
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
    [senderPhone]
  );

  const [cardMessage, setCardMessage] = useState("");

  useDebouncedEffect(
    () => {
      if (
        senderFirst.trim() !== (props.initialFirstName || "").trim() ||
        senderLast.trim() !== (props.initialLastName || "").trim()
      ) {
        void saveProfile(senderFirst, senderLast);
      }
    },
    [
      senderFirst,
      senderLast,
      props.initialFirstName,
      props.initialLastName,
      saveProfile,
    ],
    600
  );

  const onSenderBlur = () => void saveProfile(senderFirst, senderLast);

  const [receiverIsMe, setReceiverIsMe] = useState(false);
  const [recName, setRecName] = useState("");
  const [recPhone, setRecPhone] = useState("");
  const [recAddress, setRecAddress] = useState("");

  useEffect(() => {
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

  /* ---------- PACKAGING & DELIVERY ---------- */
  const [packId, setPackId] = useState<PackagingId>("normal");
  const packagingPriceIRT = packId === "gift" ? GIFT_WRAP_IRT : 0;

  const [allFast, setAllFast] = useState<boolean>(false);
  useEffect(() => {
    let cancel = false;

    async function checkFast(ids: string[]) {
      if (!ids.length) {
        if (!cancel) setAllFast(false);
        return;
      }
      const qs = new URLSearchParams({
        include: ids.join(","),
        per_page: String(Math.min(50, ids.length)),
        orderby: "include",
      });

      try {
        const r = await fetch(`/api/products?${qs.toString()}`, {
          cache: "no-store",
        });
        const arr = (await r.json()) as Array<{
          id: number;
          tags?: Array<{ id?: number; slug?: string; name?: string }>;
        }>;

        const FAST_SET = new Set(
          [
            "fast",
            "fast-deliver",
            "fast-delivery",
            "ارسال سریع",
            "ارسال-سریع",
          ].map((s) => s.toLowerCase().trim())
        );

        const allAreFast =
          ids.length > 0 &&
          (arr || []).length === ids.length &&
          (arr || []).every(
            (p) =>
              Array.isArray(p?.tags) &&
              p.tags.some((t) => {
                const slug = String(t?.slug ?? "")
                  .toLowerCase()
                  .trim();
                const name = String(t?.name ?? "")
                  .toLowerCase()
                  .trim();
                return FAST_SET.has(slug) || FAST_SET.has(name);
              })
          );

        if (!cancel) setAllFast(allAreFast);
      } catch {
        if (!cancel) setAllFast(false);
      }
    }

    checkFast(basketIds);
    return () => {
      cancel = true;
    };
  }, [basketIds.join(",")]);

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState("");
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
      for (const p of PARTS) {
        if (out.length >= 9) break;
        let disabled = false;
        if (sameDay(dayCursor, now)) {
          const h = now.getHours();
          disabled = h >= p.from;
        }
        out.push({
          id: `${dayCursor.toISOString().slice(0, 10)}_${p.part}`,
          dayLabel: faDay.format(dayCursor),
          dateLabel: faDate.format(dayCursor),
          part: p.part,
          from: p.fa[0],
          to: p.fa[1],
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
      for (const p of PARTS) {
        if (out.length >= 9) break;
        out.push({
          id: `${dayCursor.toISOString().slice(0, 10)}_${p.part}`,
          dayLabel: faDay.format(dayCursor),
          dateLabel: faDate.format(dayCursor),
          part: p.part,
          from: p.fa[0],
          to: p.fa[1],
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
        : firstEnabled?.id || out[0]?.id || ""
    );
  }, [allFast]);

  const canNext1 = Boolean(
    selectedSlotId && slots.some((s) => s.id === selectedSlotId && !s.disabled)
  );

  /* ---------- PAYMENT FIGURES (sample numbers) ---------- */
  const subtotalIRT = 5_800_000;
  const taxIRT = 580_000;
  const shippingIRT = SHIPPING_IRT;
  const totalIRT = Math.max(
    0,
    subtotalIRT + taxIRT + shippingIRT + (packId === "gift" ? GIFT_WRAP_IRT : 0)
  );

  /* ---------- NAV ---------- */
  const goNext = () => setStep((p) => (p < 2 ? ((p + 1) as 0 | 1 | 2) : p));
  const goPrev = () => setStep((p) => (p > 0 ? ((p - 1) as 0 | 1 | 2) : p));

  /* ---------- SUBMIT ---------- */
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [payMethod] = useState<"online">("online"); // currently only online

  async function handlePay() {
    setSubmitError("");
    setSubmitting(true);
    try {
      // 1) Try your existing backend flow (keeps order creation logic intact)
      const payload = {
        items: lineItems,
        sender: {
          firstName: senderFirst,
          lastName: senderLast,
          phone: senderPhone,
        },
        receiver: {
          isSelf: receiverIsMe,
          name: receiverIsMe ? `${senderFirst} ${senderLast}`.trim() : recName,
          phone: receiverIsMe ? senderPhone : normalizedRecPhone,
          address: recAddress,
        },
        postcard: cardMessage || "",
        figures: {
          subtotal: subtotalIRT,
          tax: taxIRT,
          discount: 0,
          total: totalIRT,
          shipping: shippingIRT,
          packaging: packId === "gift" ? GIFT_WRAP_IRT : 0,
        },
        delivery: { slot_id: selectedSlotId },
        packaging: {
          id: packId,
          title: packId === "gift" ? "بسته‌بندی کادویی" : "بسته‌بندی عادی",
          price: packId === "gift" ? GIFT_WRAP_IRT : 0,
        },
        payMethod: "online" as const,
      };

      let redirectUrl = "";
      try {
        const r = await fetch("/api/checkout/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => ({} as any));
        if (r.ok && data?.ok && data?.redirectUrl)
          redirectUrl = String(data.redirectUrl);
      } catch {
        // ignore, we will fallback
      }

      // 2) Fallback to Zarinpal direct start if previous step didn't give a URL
      if (!redirectUrl) {
        const zr = await fetch("/api/pay/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: totalIRT, // IRT by default
            description: `پرداخت سفارش`,
            mobile: senderPhone,
            orderId: Date.now(),
            currency: "IRT",
          }),
        });
        const zd = await zr.json().catch(() => ({} as any));
        if (!zr.ok || !zd?.ok || !zd?.url) {
          throw new Error(zd?.error || "zarinpal_request_failed");
        }
        redirectUrl = String(zd.url);
      }

      window.location.href = redirectUrl;
    } catch (e: any) {
      setSubmitError("پرداخت با خطا مواجه شد. لطفاً دوباره تلاش کنید.");
      setSubmitting(false);
    }
  }

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
                <span className={s.savingHint} aria-live="polite">
                  در حال ذخیره…
                </span>
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
              {(["normal", "gift"] as PackagingId[]).map((id) => {
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
              disabled={!canNext1}
              onClick={goNext}
              className={s.nextBtn}
              fullWidth
            >
              مرحله بعد
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

          {/* Radio inside a selectable card (like packaging) */}
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

          {/* Payment details styled like Order Detail page */}
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
              <div className={s.detailVal}>
                {toman(packId === "gift" ? GIFT_WRAP_IRT : 0)} تومان
              </div>
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
