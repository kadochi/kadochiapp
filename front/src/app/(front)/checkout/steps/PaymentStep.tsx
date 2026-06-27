"use client";

/**
 * Checkout step 2 — Payment method and cost breakdown.
 * Presentational; all state lives in the parent orchestrator.
 */

import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Divider from "@/components/ui/Divider/Divider";
import Button from "@/components/ui/Button/Button";
import Radio from "@/components/ui/Radio/Radio";
import { toman } from "../checkout.helpers";
import s from "../Checkout.module.css";

export type PaymentStepProps = {
  subtotalIRT: number;
  taxIRT: number;
  shippingIRT: number;
  packagingIRT: number;
  totalIRT: number;
  submitting: boolean;
  submitError: string;
  handlePay: () => void;
  goPrev: () => void;
};

export default function PaymentStep({
  subtotalIRT,
  taxIRT,
  shippingIRT,
  packagingIRT,
  totalIRT,
  submitting,
  submitError,
  handlePay,
  goPrev,
}: PaymentStepProps) {
  return (
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
  );
}
