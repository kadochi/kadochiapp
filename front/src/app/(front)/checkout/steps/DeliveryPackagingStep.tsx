"use client";

/**
 * Checkout step 1 — Delivery window, packaging, and postcard message.
 * Presentational; all state lives in the parent orchestrator.
 */

import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Divider from "@/components/ui/Divider/Divider";
import Button from "@/components/ui/Button/Button";
import TextArea from "@/components/ui/TextArea/TextArea";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import type { PackagingId, Slot } from "../checkout.helpers";
import s from "../Checkout.module.css";

export type DeliveryPackagingStepProps = {
  slots: Slot[];
  selectedSlotId: string;
  setSelectedSlotId: (id: string) => void;
  packId: PackagingId;
  setPackId: (id: PackagingId) => void;
  cardMessage: string;
  setCardMessage: (v: string) => void;
  canNext1: boolean;
  pricingLoading: boolean;
  pricingReady: boolean;
  goNext: () => void;
  goPrev: () => void;
};

export default function DeliveryPackagingStep({
  slots,
  selectedSlotId,
  setSelectedSlotId,
  packId,
  setPackId,
  cardMessage,
  setCardMessage,
  canNext1,
  pricingLoading,
  pricingReady,
  goNext,
  goPrev,
}: DeliveryPackagingStepProps) {
  return (
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
                className={`${s.packCard} ${active ? s.packCardActive : ""}`}
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
  );
}
