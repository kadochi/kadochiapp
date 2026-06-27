"use client";

/**
 * Checkout page
 * -----------------------------------------------------------------------------
 * - Multi-step checkout flow (sender/receiver → delivery/packaging → payment).
 * - Prices are fetched from Woo Store API to compute final totals.
 * - Payment step is only reachable after pricing is fully resolved, so amounts
 *   do not "jump" a few seconds after the payment screen shows.
 *
 * This file is a thin orchestrator: helpers live in checkout.helpers.ts, the
 * data/state in checkout.hooks.ts + useCheckoutPricing.ts, and each step UI in
 * steps/*.tsx.
 */

import { useEffect, useMemo, useState } from "react";
import ProgressStepper from "@/components/ui/ProgressStepper/ProgressStepper";
import { useBasket } from "@/domains/basket/state/basket-context";
import s from "./Checkout.module.css";
import { buildStepper, type PackagingId } from "./checkout.helpers";
import { useCheckoutPricing, useFastDelivery } from "./useCheckoutPricing";
import {
  useCheckoutSubmit,
  useCheckoutTotals,
  useDeliverySlots,
  useSenderReceiver,
} from "./checkout.hooks";
import SenderReceiverStep from "./steps/SenderReceiverStep";
import DeliveryPackagingStep from "./steps/DeliveryPackagingStep";
import PaymentStep from "./steps/PaymentStep";

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

  /* Pricing + delivery */
  const { items, pricingLoading, pricingReady } = useCheckoutPricing(basketIds);
  const allFast = useFastDelivery(basketIds);
  const { slots, selectedSlotId, setSelectedSlotId, canNext1 } =
    useDeliverySlots(allFast);

  /* Sender / receiver form */
  const form = useSenderReceiver(props);
  const canNext0 = form.validSender && form.validReceiver && lineItems.length > 0;

  /* Packaging selection + postcard */
  // پیش‌فرض: بسته‌بندی کادویی
  const [packId, setPackId] = useState<PackagingId>("gift");
  const [cardMessage, setCardMessage] = useState("");

  /* Totals + submission */
  const totals = useCheckoutTotals(items, basket, packId);
  const { submitting, submitError, handlePay } = useCheckoutSubmit({
    senderFirst: form.senderFirst,
    senderLast: form.senderLast,
    senderPhone: form.senderPhone,
    receiverIsMe: form.receiverIsMe,
    recName: form.recName,
    recPhone: form.recPhone,
    recAddress: form.recAddress,
    lineItems,
    selectedSlotId,
    allFast,
    packId,
    cardMessage,
    ...totals,
  });

  /* Step navigation */
  const goNext = () => setStep((p) => (p < 2 ? ((p + 1) as 0 | 1 | 2) : p));
  const goPrev = () => setStep((p) => (p > 0 ? ((p - 1) as 0 | 1 | 2) : p));

  return (
    <div>
      <div className={s.stepper}>
        <ProgressStepper steps={steps} showIndex={false} />
      </div>

      {step === 0 && (
        <SenderReceiverStep
          senderFirst={form.senderFirst}
          setSenderFirst={form.setSenderFirst}
          senderLast={form.senderLast}
          setSenderLast={form.setSenderLast}
          senderPhone={form.senderPhone}
          savingProfile={form.savingProfile}
          onSenderBlur={form.onSenderBlur}
          receiverIsMe={form.receiverIsMe}
          setReceiverIsMe={form.setReceiverIsMe}
          recName={form.recName}
          setRecName={form.setRecName}
          recPhone={form.recPhone}
          setRecPhone={form.setRecPhone}
          recAddress={form.recAddress}
          setRecAddress={form.setRecAddress}
          canNext0={canNext0}
          goNext={goNext}
        />
      )}

      {step === 1 && (
        <DeliveryPackagingStep
          slots={slots}
          selectedSlotId={selectedSlotId}
          setSelectedSlotId={setSelectedSlotId}
          packId={packId}
          setPackId={setPackId}
          cardMessage={cardMessage}
          setCardMessage={setCardMessage}
          canNext1={canNext1}
          pricingLoading={pricingLoading}
          pricingReady={pricingReady}
          goNext={goNext}
          goPrev={goPrev}
        />
      )}

      {step === 2 && (
        <PaymentStep
          subtotalIRT={totals.subtotalIRT}
          taxIRT={totals.taxIRT}
          shippingIRT={totals.shippingIRT}
          packagingIRT={totals.packagingIRT}
          totalIRT={totals.totalIRT}
          submitting={submitting}
          submitError={submitError}
          handlePay={handlePay}
          goPrev={goPrev}
        />
      )}
    </div>
  );
}
