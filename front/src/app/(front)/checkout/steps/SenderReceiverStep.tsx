"use client";

/**
 * Checkout step 0 — Sender & Receiver.
 * Presentational; all state lives in the parent orchestrator.
 */

import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Divider from "@/components/ui/Divider/Divider";
import Button from "@/components/ui/Button/Button";
import Input from "@/components/ui/Input/Input";
import Checkbox from "@/components/ui/Checkbox/Checkbox";
import TextArea from "@/components/ui/TextArea/TextArea";
import s from "../Checkout.module.css";

export type SenderReceiverStepProps = {
  senderFirst: string;
  setSenderFirst: (v: string) => void;
  senderLast: string;
  setSenderLast: (v: string) => void;
  senderPhone: string;
  savingProfile: boolean;
  onSenderBlur: () => void;
  receiverIsMe: boolean;
  setReceiverIsMe: (v: boolean) => void;
  recName: string;
  setRecName: (v: string) => void;
  recPhone: string;
  setRecPhone: (v: string) => void;
  recAddress: string;
  setRecAddress: (v: string) => void;
  canNext0: boolean;
  goNext: () => void;
};

export default function SenderReceiverStep({
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
  canNext0,
  goNext,
}: SenderReceiverStepProps) {
  return (
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
  );
}
