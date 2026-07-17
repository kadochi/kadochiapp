"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { ProgressStepper } from "@/components/ui/progress-stepper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio";
import { TextArea } from "@/components/ui/textarea";
import { selectShippingRate } from "@/features/cart/services/cart";
import { formatIrrAsToman } from "@/features/cart/utils/money";
import { submitCheckoutSchema } from "../schema/checkout";
import { submitCheckout } from "../services/checkout";
import type { CheckoutState } from "../types";

type RecipientKind = "self" | "other";

export function CheckoutFlow({ initialState }: { initialState: CheckoutState }) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(0);
  const [recipientKind, setRecipientKind] = useState<RecipientKind>("self");
  const [senderFirstName, setSenderFirstName] = useState(initialState.customer.firstName);
  const [senderLastName, setSenderLastName] = useState(initialState.customer.lastName);
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [postcode, setPostcode] = useState("");
  const [deliverySlotId, setDeliverySlotId] = useState(initialState.deliverySlots[0]?.id ?? "");
  const [packagingId, setPackagingId] = useState<"gift" | "normal">("gift");
  const [postcardText, setPostcardText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingRate, setPendingRate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reconciliationUnknown, setReconciliationUnknown] = useState(false);

  const steps = useMemo(() => [
    { id: "details", label: "مشخصات", status: step > 0 ? "complete" as const : "current" as const },
    { id: "delivery", label: "ارسال", status: step > 1 ? "complete" as const : step === 1 ? "current" as const : "upcoming" as const },
    { id: "payment", label: "پرداخت", status: step === 2 ? "current" as const : "upcoming" as const },
  ], [step]);

  const validateDetails = () => {
    if (!senderFirstName.trim() || !senderLastName.trim()) return "نام و نام خانوادگی فرستنده را وارد کنید.";
    if (recipientKind === "other" && (!recipientFirstName.trim() || !recipientLastName.trim())) return "نام و نام خانوادگی گیرنده را وارد کنید.";
    if (address1.trim().length < 5) return "نشانی گیرنده را کامل وارد کنید.";
    if (postcode && !/^\d{10}$/.test(postcode)) return "کدپستی باید ۱۰ رقم باشد.";
    return null;
  };

  const next = () => {
    setError(null);
    if (step === 0) {
      const validationError = validateDetails();
      if (validationError) return setError(validationError);
    }
    if (step === 1 && !deliverySlotId) return setError("یک بازه ارسال انتخاب کنید.");
    setStep((current) => Math.min(2, current + 1));
  };

  const chooseShippingRate = async (packageId: number, rateId: string) => {
    if (pendingRate) return;
    setPendingRate(rateId);
    setError(null);
    try {
      const cart = await selectShippingRate({ packageId, rateId });
      setState((current) => ({ ...current, cart }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "انتخاب روش ارسال ذخیره نشد.");
    } finally {
      setPendingRate(null);
    }
  };

  const pay = async () => {
    if (submitting || reconciliationUnknown) return;
    const validationError = validateDetails();
    if (validationError) {
      setError(validationError);
      setStep(0);
      return;
    }
    if (!deliverySlotId) {
      setError("یک بازه ارسال انتخاب کنید.");
      setStep(1);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = submitCheckoutSchema.parse({
        sender: { firstName: senderFirstName, lastName: senderLastName },
        recipient: recipientKind === "self"
          ? { kind: "self" }
          : { kind: "other", firstName: recipientFirstName, lastName: recipientLastName },
        address: { address1, address2: address2 || undefined, postcode: postcode || undefined },
        deliverySlotId,
        packagingId,
        postcardText,
        operationId: crypto.randomUUID(),
      });
      const result = await submitCheckout(payload);
      if (result.reconciliation === "paid" && result.orderId) {
        router.replace(`/checkout/success?order=${result.orderId}`);
        return;
      }
      if (result.reconciliation === "unpaid" && result.orderId) {
        router.replace(`/checkout/failure?order=${result.orderId}`);
        return;
      }
      if (result.reconciliation === "unknown") {
        setReconciliationUnknown(true);
        setError("وضعیت پرداخت نامشخص است. دوباره پرداخت را شروع نکنید؛ چند دقیقه بعد از لینک بازگشت یا پشتیبانی پیگیری کنید.");
        return;
      }
      if (result.paymentResult?.redirectUrl) {
        window.location.assign(result.paymentResult.redirectUrl);
        return;
      }
      if (result.orderId) {
        router.replace(`/checkout/return?order=${result.orderId}`);
        return;
      }
      setError("درگاه پرداخت پاسخ معتبری نداد. لطفاً با پشتیبانی تماس بگیرید.");
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError("اطلاعات سفارش را بررسی کنید.");
      } else {
        setError(caught instanceof Error ? caught.message : "ثبت سفارش ناموفق بود.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[640px] px-16 pb-128 pt-16 [direction:rtl]">
      <ProgressStepper aria-label="مراحل ثبت سفارش" size="sm" steps={steps} />
      {error ? <Alert className="mt-20" tone="error">{error}</Alert> : null}

      <section className="mt-24 rounded-l border border-border-low-emphasis bg-surface-background p-16">
        {step === 0 ? <DetailsStep
          customer={state.customer}
          senderFirstName={senderFirstName} senderLastName={senderLastName}
          recipientKind={recipientKind} recipientFirstName={recipientFirstName} recipientLastName={recipientLastName}
          address1={address1} address2={address2} postcode={postcode}
          onSenderFirstName={setSenderFirstName} onSenderLastName={setSenderLastName}
          onRecipientKind={setRecipientKind} onRecipientFirstName={setRecipientFirstName} onRecipientLastName={setRecipientLastName}
          onAddress1={setAddress1} onAddress2={setAddress2} onPostcode={setPostcode}
        /> : null}
        {step === 1 ? <DeliveryStep
          state={state} deliverySlotId={deliverySlotId} packagingId={packagingId} postcardText={postcardText}
          pendingRate={pendingRate}
          onDeliverySlot={setDeliverySlotId} onPackaging={setPackagingId} onPostcard={setPostcardText} onShippingRate={chooseShippingRate}
        /> : null}
        {step === 2 ? <PaymentStep state={state} /> : null}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-low-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-16))] pt-12 shadow-[0_-8px_24px_rgba(0,0,0,.06)]">
        <div className="mx-auto max-w-[640px]">
          <div className="mb-12 flex items-center justify-between">
            <span className="text-label-14 text-surface-neutral-mid-emphasis">مبلغ قابل پرداخت</span>
            <span className="text-title-16 font-extrabold">{formatIrrAsToman(state.cart.totals.totalPrice)}</span>
          </div>
          {step < 2 ? <Button className="w-full" onClick={next} size="large" variant="primary-filled">ادامه</Button> : <Button className="w-full" disabled={reconciliationUnknown} loading={submitting} onClick={pay} size="large" variant="primary-filled">پرداخت آنلاین</Button>}
          {step > 0 ? <Button className="mt-8 w-full" disabled={submitting} onClick={() => setStep((current) => current - 1)} size="medium" variant="link-ghost">بازگشت به مرحله قبل</Button> : null}
        </div>
      </div>
    </div>
  );
}

function DetailsStep(props: {
  customer: CheckoutState["customer"];
  senderFirstName: string; senderLastName: string; recipientKind: RecipientKind; recipientFirstName: string; recipientLastName: string; address1: string; address2: string; postcode: string;
  onSenderFirstName: (value: string) => void; onSenderLastName: (value: string) => void; onRecipientKind: (value: RecipientKind) => void; onRecipientFirstName: (value: string) => void; onRecipientLastName: (value: string) => void; onAddress1: (value: string) => void; onAddress2: (value: string) => void; onPostcode: (value: string) => void;
}) {
  return <div className="space-y-20">
    <div><h1 className="text-title-18 font-bold">مشخصات سفارش</h1><p className="mt-4 text-label-14 text-surface-neutral-mid-emphasis">شماره {props.customer.phone} و {props.customer.email} از حساب کاربری شما استفاده می‌شود.</p></div>
    <div className="grid gap-12 sm:grid-cols-2"><Input label="نام فرستنده" required value={props.senderFirstName} onChange={(event) => props.onSenderFirstName(event.target.value)} /><Input label="نام خانوادگی فرستنده" required value={props.senderLastName} onChange={(event) => props.onSenderLastName(event.target.value)} /></div>
    <Divider />
    <div><h2 className="text-title-16 font-bold">گیرنده سفارش</h2><RadioGroup className="mt-12 gap-12" onValueChange={(value) => props.onRecipientKind(value as RecipientKind)} value={props.recipientKind}><RadioGroupItem label="خودم هستم" value="self" /><RadioGroupItem label="برای شخص دیگری است" value="other" /></RadioGroup></div>
    {props.recipientKind === "other" ? <div className="grid gap-12 sm:grid-cols-2"><Input label="نام گیرنده" required value={props.recipientFirstName} onChange={(event) => props.onRecipientFirstName(event.target.value)} /><Input label="نام خانوادگی گیرنده" required value={props.recipientLastName} onChange={(event) => props.onRecipientLastName(event.target.value)} /></div> : null}
    <TextArea label="نشانی گیرنده در تهران" required value={props.address1} onChange={(event) => props.onAddress1(event.target.value)} />
    <Input label="پلاک، واحد یا توضیحات تکمیلی" value={props.address2} onChange={(event) => props.onAddress2(event.target.value)} />
    <Input inputMode="numeric" label="کدپستی (اختیاری)" maxLength={10} value={props.postcode} onChange={(event) => props.onPostcode(event.target.value.replace(/\D/g, ""))} />
  </div>;
}

function DeliveryStep(props: {
  state: CheckoutState; deliverySlotId: string; packagingId: "gift" | "normal"; postcardText: string; pendingRate: string | null;
  onDeliverySlot: (value: string) => void; onPackaging: (value: "gift" | "normal") => void; onPostcard: (value: string) => void; onShippingRate: (packageId: number, rateId: string) => void;
}) {
  return <div className="space-y-24">
    <div><h1 className="text-title-18 font-bold">زمان و شیوه ارسال</h1><p className="mt-4 text-label-14 text-surface-neutral-mid-emphasis">زمان‌های قابل انتخاب با وضعیت فعلی سبد خرید شما محاسبه شده‌اند.</p></div>
    <RadioGroup onValueChange={props.onDeliverySlot} value={props.deliverySlotId}>{props.state.deliverySlots.map((slot) => <RadioGroupItem key={slot.id} className="w-full rounded-m border border-border-low-emphasis p-12" label={slot.label} value={slot.id} />)}</RadioGroup>
    {props.state.cart.shippingRates.map((group) => group.rates.length > 1 ? <div key={group.packageId}><Divider /><h2 className="mt-20 text-title-16 font-bold">روش ارسال</h2><RadioGroup className="mt-12" value={group.selectedRate ?? ""} onValueChange={(value) => props.onShippingRate(group.packageId, value)}>{group.rates.map((rate) => <RadioGroupItem key={rate.rateId} className="w-full rounded-m border border-border-low-emphasis p-12" disabled={props.pendingRate !== null} label={<span className="flex w-full justify-between gap-12"><span>{rate.name}</span><span>{formatIrrAsToman(rate.price)}</span></span>} value={rate.rateId} />)}</RadioGroup></div> : null)}
    <div><Divider /><h2 className="mt-20 text-title-16 font-bold">بسته‌بندی</h2><RadioGroup className="mt-12" onValueChange={(value) => props.onPackaging(value as "gift" | "normal")} value={props.packagingId}>{props.state.packagingOptions.map((option) => <RadioGroupItem key={option.id} className="w-full rounded-m border border-border-low-emphasis p-12" label={<span className="flex w-full items-center justify-between"><span className="flex items-center gap-12"><img alt="" className="size-40 rounded-s object-cover" src={option.imageUrl} />{option.label}</span><span>{formatIrrAsToman(option.fee)}</span></span>} value={option.id} />)}</RadioGroup></div>
    <TextArea label="متن کارت پستال (اختیاری)" maxLength={500} showCount value={props.postcardText} onChange={(event) => props.onPostcard(event.target.value)} />
  </div>;
}

function PaymentStep({ state }: { state: CheckoutState }) {
  return <div className="space-y-20"><div><h1 className="text-title-18 font-bold">پرداخت</h1><p className="mt-4 text-label-14 text-surface-neutral-mid-emphasis">پس از ثبت سفارش به درگاه امن پرداخت منتقل می‌شوید.</p></div><div className="rounded-m border border-secondary bg-secondary-container p-16"><p className="text-title-16 font-bold text-on-secondary-container">{state.paymentMethod.title}</p><p className="mt-4 text-label-14 text-on-secondary-container">فقط پرداخت آنلاین فعال است.</p></div><Divider /><div className="space-y-12 text-label-14"><p className="flex justify-between"><span>جمع کالاها</span><span>{formatIrrAsToman(state.cart.totals.totalItems)}</span></p><p className="flex justify-between"><span>هزینه ارسال</span><span>{formatIrrAsToman(state.cart.totals.totalShipping)}</span></p>{state.cart.totals.totalDiscount.amount !== "0" ? <p className="flex justify-between text-success"><span>تخفیف</span><span>− {formatIrrAsToman(state.cart.totals.totalDiscount)}</span></p> : null}<Divider /><p className="flex justify-between text-title-16 font-bold"><span>جمع کل</span><span>{formatIrrAsToman(state.cart.totals.totalPrice)}</span></p></div></div>;
}
