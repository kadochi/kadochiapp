"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Plus } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Chip } from "@/components/ui/chip";
import { Divider } from "@/components/ui/divider";
import { Input } from "@/components/ui/input";
import { ProgressStepper } from "@/components/ui/progress-stepper";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio";
import { useToast } from "@/components/ui/toaster";
import SectionHeader from "@/components/layout/section-header";
import { TextArea } from "@/components/ui/textarea";
import { applyCoupon, removeCoupon, selectShippingRate, updateCustomer } from "@/features/cart/services/cart";
import { formatIrrAsToman } from "@/features/cart/utils/money";
import { AddressEditorSheet } from "./address-editor-sheet";
import { SavedAddressCard } from "./saved-address-card";
import { submitCheckoutSchema } from "../schema/checkout";
import { createSavedAddress, deleteSavedAddress, submitCheckout, updateSavedAddress } from "../services/checkout";
import type { CheckoutState, SavedAddress } from "../types";
import { checkoutResultAction } from "../utils/checkout-result";
import { logPaymentFailure, paymentErrorMessage } from "../utils/payment-error";
import { iranianPhoneSchema } from "../../auth/schema/auth";

type RecipientKind = "self" | "other";
type DetailsErrors = Partial<Record<"senderFirstName" | "senderLastName" | "recipientFirstName" | "recipientLastName" | "recipientPhone", string>>;

const CHECKOUT_STEPS = [
  { id: "details", label: "تکمیل اطلاعات" },
  { id: "delivery", label: "بسته‌بندی و ارسال" },
  { id: "payment", label: "پرداخت" },
] as const;

const faWeekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });
const faDate = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" });

function deliveryPart(startHour: number) {
  if (startHour === 10) return "صبح";
  if (startHour === 13) return "ظهر";
  return "عصر";
}

function deliveryDate(date: string) {
  const value = new Date(`${date}T12:00:00Z`);
  return { weekday: faWeekday.format(value), date: faDate.format(value) };
}

export function CheckoutFlow({ initialState }: { initialState: CheckoutState }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState(initialState);
  const [step, setStep] = useState(0);
  const [recipientKind, setRecipientKind] = useState<RecipientKind>("other");
  const [senderFirstName, setSenderFirstName] = useState(initialState.customer.firstName);
  const [senderLastName, setSenderLastName] = useState(initialState.customer.lastName);
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [detailsErrors, setDetailsErrors] = useState<DetailsErrors>({});
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(initialState.savedAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState(initialState.savedAddresses[0]?.id ?? "");
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [removingAddressId, setRemovingAddressId] = useState<string | null>(null);
  const [deliverySlotId, setDeliverySlotId] = useState(initialState.deliverySlots[0]?.id ?? "");
  const [packagingId, setPackagingId] = useState<"gift" | "normal">(
    initialState.packagingOptions.find((option) => option.default)?.id ?? "gift",
  );
  const [postcardText, setPostcardText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [pendingRate, setPendingRate] = useState<string | null>(null);
  const [pendingCoupon, setPendingCoupon] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reconciliationUnknown, setReconciliationUnknown] = useState(false);
  const submissionLock = useRef(false);
  const operationId = useRef<string | null>(null);
  const selectedAddress = savedAddresses.find((address) => address.id === selectedAddressId);

  const openNewAddress = () => {
    setEditingAddress(null);
    setAddressSheetOpen(true);
  };

  const removeAddress = async (address: SavedAddress) => {
    if (removingAddressId) return;
    setRemovingAddressId(address.id);
    try {
      await deleteSavedAddress(address.id);
      const nextAddresses = savedAddresses.filter((item) => item.id !== address.id);
      setSavedAddresses(nextAddresses);
      if (selectedAddressId === address.id) setSelectedAddressId(nextAddresses[0]?.id ?? "");
      toast({ tone: "success", title: "آدرس حذف شد" });
    } catch (caught) {
      toast({ tone: "error", title: "حذف آدرس انجام نشد", description: caught instanceof Error ? caught.message : undefined });
    } finally {
      setRemovingAddressId(null);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const validateDetails = (): DetailsErrors => {
    const validationErrors: DetailsErrors = {};
    if (!senderFirstName.trim()) validationErrors.senderFirstName = "نام فرستنده را وارد کنید.";
    if (!senderLastName.trim()) validationErrors.senderLastName = "نام خانوادگی فرستنده را وارد کنید.";
    if (recipientKind === "other") {
      if (!recipientFirstName.trim()) validationErrors.recipientFirstName = "نام گیرنده را وارد کنید.";
      if (!recipientLastName.trim()) validationErrors.recipientLastName = "نام خانوادگی گیرنده را وارد کنید.";
      if (!recipientPhone.trim()) validationErrors.recipientPhone = "شماره موبایل گیرنده را وارد کنید.";
      else if (!iranianPhoneSchema.safeParse(recipientPhone).success) validationErrors.recipientPhone = "شماره موبایل معتبر وارد کنید.";
    }
    return validationErrors;
  };

  const clearDetailsError = (field: keyof DetailsErrors) => {
    setDetailsErrors((current) => ({ ...current, [field]: undefined }));
  };

  const next = async () => {
    setError(null);
    if (step === 0) {
      const validationErrors = validateDetails();
      setDetailsErrors(validationErrors);
      if (Object.keys(validationErrors).length) return;
      if (!selectedAddress) {
        toast({ tone: "error", title: "یک آدرس را اضافه یا انتخاب کنید", description: "برای ادامه، باید یک نشانی دریافت سفارش انتخاب کنید." });
        return;
      }
      const address = selectedAddress;
      if (!address) return;
      const recipient = recipientKind === "self"
        ? { firstName: senderFirstName, lastName: senderLastName, phone: state.customer.phone }
        : { firstName: recipientFirstName, lastName: recipientLastName, phone: iranianPhoneSchema.parse(recipientPhone) };
      setSavingAddress(true);
      try {
        const cart = await updateCustomer({
          billingAddress: {
            firstName: senderFirstName,
            lastName: senderLastName,
            address1: address.address1,
            address2: address.address2 || undefined,
            city: "تهران",
            country: "IR",
            email: state.customer.email,
            phone: state.customer.phone,
          },
          shippingAddress: {
            ...recipient,
            address1: address.address1,
            address2: address.address2 || undefined,
            city: "تهران",
            country: "IR",
          },
        });
        setState((current) => ({ ...current, cart }));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "محاسبه هزینه ارسال و مالیات انجام نشد.");
        return;
      } finally {
        setSavingAddress(false);
      }
    }
    if (step === 1 && !deliverySlotId) return setError("یک بازه ارسال انتخاب کنید.");
    setStep((current) => Math.min(2, current + 1));
  };

  const previous = () => {
    setError(null);
    setStep((current) => Math.max(0, current - 1));
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

  const addCoupon = async (code: string) => {
    if (pendingCoupon) return false;
    if (state.cart.coupons.length > 0) {
      toast({
        tone: "error",
        title: "ابتدا کد تخفیف قبلی را حذف کنید",
      });
      return false;
    }
    setPendingCoupon("apply");
    try {
      const cart = await applyCoupon({ code });
      setState((current) => ({ ...current, cart }));
      toast({
        tone: "success",
        title: "کد تخفیف اعمال شد",
        description: `کد ${code} با موفقیت اعمال شد.`,
      });
      return true;
    } catch (caught) {
      toast({
        tone: "error",
        title: "اعمال کد تخفیف ناموفق بود",
        description: caught instanceof Error ? caught.message : undefined,
      });
      return false;
    } finally {
      setPendingCoupon(null);
    }
  };

  const deleteCoupon = async (code: string) => {
    if (pendingCoupon) return;
    setPendingCoupon(code);
    try {
      const cart = await removeCoupon(code);
      setState((current) => ({ ...current, cart }));
      toast({
        tone: "success",
        title: "کد تخفیف حذف شد",
        description: `کد ${code} با موفقیت حذف شد.`,
      });
    } catch (caught) {
      toast({
        tone: "error",
        title: "حذف کد تخفیف ناموفق بود",
        description: caught instanceof Error ? caught.message : undefined,
      });
    } finally {
      setPendingCoupon(null);
    }
  };

  const pay = async () => {
    if (submissionLock.current || reconciliationUnknown) return;
    const validationErrors = validateDetails();
    if (Object.keys(validationErrors).length) {
      setDetailsErrors(validationErrors);
      setStep(0);
      return;
    }
    if (!deliverySlotId) {
      setError("یک بازه ارسال انتخاب کنید.");
      setStep(1);
      return;
    }
    const address = selectedAddress;
    if (!address) {
      setError("یک نشانی برای دریافت سفارش انتخاب کنید.");
      setStep(0);
      return;
    }

    submissionLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const payload = submitCheckoutSchema.parse({
        sender: { firstName: senderFirstName, lastName: senderLastName },
        recipient: recipientKind === "self"
          ? { kind: "self" }
          : { kind: "other", firstName: recipientFirstName, lastName: recipientLastName, phone: iranianPhoneSchema.parse(recipientPhone) },
        address: {
          address1: address.address1,
          address2: address.address2 || undefined,
          location: address.location ?? undefined,
        },
        deliverySlotId,
        packagingId,
        postcardText,
        operationId: operationId.current ?? (operationId.current = crypto.randomUUID()),
      });
      const result = await submitCheckout(payload);
      const action = checkoutResultAction(result);
      if (action.kind === "navigate") {
        router.replace(action.href);
        return;
      }
      if (action.kind === "external") {
        window.location.assign(action.href);
        return;
      }
      if (action.kind === "unknown") {
        setReconciliationUnknown(true);
        setError("وضعیت پرداخت نامشخص است. دوباره پرداخت را شروع نکنید؛ چند دقیقه بعد از لینک بازگشت یا پشتیبانی پیگیری کنید.");
        return;
      }
      setError("درگاه پرداخت پاسخ معتبری نداد. لطفاً با پشتیبانی تماس بگیرید.");
    } catch (caught) {
      if (caught instanceof z.ZodError) {
        setError("اطلاعات سفارش را بررسی کنید.");
      } else {
        logPaymentFailure("checkout_submission_failed", caught);
        setError(paymentErrorMessage(caught, "ثبت سفارش ناموفق بود.").message);
      }
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[580px] pb-[calc(var(--spacing-128)+max(env(safe-area-inset-bottom),var(--spacing-24)))] [direction:rtl]">
      <div className="px-16 pb-12 pt-12">
        <ProgressStepper aria-label="مراحل ثبت سفارش" showStepNumber={false} size="md" steps={CHECKOUT_STEPS} value={step} />
      </div>

      {error ? <Alert className="mx-16 mb-16" tone="error">{error}</Alert> : null}

      {step === 0 ? <DetailsStep
        customer={state.customer}
        senderFirstName={senderFirstName} senderLastName={senderLastName}
        recipientKind={recipientKind} recipientFirstName={recipientFirstName} recipientLastName={recipientLastName} recipientPhone={recipientPhone} errors={detailsErrors}
        addresses={savedAddresses} selectedAddressId={selectedAddressId}
        onSenderFirstName={(value) => { setSenderFirstName(value); clearDetailsError("senderFirstName"); }} onSenderLastName={(value) => { setSenderLastName(value); clearDetailsError("senderLastName"); }}
        onRecipientKind={(value) => { setRecipientKind(value); setDetailsErrors({}); }} onRecipientFirstName={(value) => { setRecipientFirstName(value); clearDetailsError("recipientFirstName"); }} onRecipientLastName={(value) => { setRecipientLastName(value); clearDetailsError("recipientLastName"); }} onRecipientPhone={(value) => { setRecipientPhone(value); clearDetailsError("recipientPhone"); }}
        onAddressSheetOpen={openNewAddress} onSelectAddress={setSelectedAddressId}
        onEditAddress={(address) => { setEditingAddress(address); setAddressSheetOpen(true); }} onDeleteAddress={removeAddress} removingAddressId={removingAddressId}
      /> : null}
      {step === 1 ? <DeliveryStep
        state={state} deliverySlotId={deliverySlotId} packagingId={packagingId} postcardText={postcardText}
        pendingRate={pendingRate}
        onDeliverySlot={setDeliverySlotId} onPackaging={setPackagingId} onPostcard={setPostcardText} onShippingRate={chooseShippingRate}
      /> : null}
      {step === 2 ? <PaymentStep state={state} couponPending={pendingCoupon} onApplyCoupon={addCoupon} onRemoveCoupon={deleteCoupon} /> : null}

      <CheckoutFooter
        canContinue={step === 0 ? true : Boolean(deliverySlotId)}
        onNext={next}
        onPay={pay}
        onPrevious={previous}
        nextPending={savingAddress}
        reconciliationUnknown={reconciliationUnknown}
        step={step}
        submitting={submitting}
      />

      <AddressEditorSheet
        address={editingAddress}
        open={addressSheetOpen}
        onOpenChange={(open) => { setAddressSheetOpen(open); if (!open) setEditingAddress(null); }}
        onSave={async (address) => {
          if (editingAddress) {
            const saved = await updateSavedAddress(editingAddress.id, address);
            setSavedAddresses((current) => current.map((item) => item.id === saved.id ? saved : item));
          } else {
            const saved = await createSavedAddress(address);
            setSavedAddresses((current) => [saved, ...current]);
            setSelectedAddressId(saved.id);
          }
        }}
      />
    </div>
  );
}

function DetailsStep(props: {
  customer: CheckoutState["customer"];
  senderFirstName: string; senderLastName: string; recipientKind: RecipientKind; recipientFirstName: string; recipientLastName: string; recipientPhone: string; errors: DetailsErrors; addresses: SavedAddress[]; selectedAddressId: string;
  onSenderFirstName: (value: string) => void; onSenderLastName: (value: string) => void; onRecipientKind: (value: RecipientKind) => void; onRecipientFirstName: (value: string) => void; onRecipientLastName: (value: string) => void; onRecipientPhone: (value: string) => void;
  onAddressSheetOpen: () => void; onSelectAddress: (id: string) => void; onEditAddress: (address: SavedAddress) => void; onDeleteAddress: (address: SavedAddress) => void; removingAddressId: string | null;
}) {
  const receiverIsSender = props.recipientKind === "self";
  return <>
    <SectionHeader as="h2" subtitle="اطلاعات فرستنده سفارش" title="مشخصات فرستنده" />
    <section className="px-16 pb-16">
      <div className="grid gap-12 min-[460px]:grid-cols-2">
        <Input description={props.errors.senderFirstName} label="نام" required status={props.errors.senderFirstName ? "error" : "default"} value={props.senderFirstName} onChange={(event) => props.onSenderFirstName(event.target.value)} />
        <Input description={props.errors.senderLastName} label="نام خانوادگی" required status={props.errors.senderLastName ? "error" : "default"} value={props.senderLastName} onChange={(event) => props.onSenderLastName(event.target.value)} />
      </div>
      <Input className="mt-12" description="شماره موبایل شما از حساب کاربری خوانده شده و قابل ویرایش نیست." dir="ltr" disabled label="شماره موبایل" value={props.customer.phone} />
    </section>

    <Divider size="md" variant="spacer" />

    <SectionHeader
      as="h2"
      leftSlot={<Checkbox checked={receiverIsSender} label="گیرنده خودم هستم" onCheckedChange={(checked) => props.onRecipientKind(checked ? "self" : "other")} />}
      subtitle="اطلاعات تحویل گیرنده سفارش"
      title="مشخصات گیرنده"
    />
    <section className="px-16 pb-16">
      {!receiverIsSender ? <div className="grid gap-12 min-[460px]:grid-cols-2">
        <Input description={props.errors.recipientFirstName} label="نام گیرنده" required status={props.errors.recipientFirstName ? "error" : "default"} value={props.recipientFirstName} onChange={(event) => props.onRecipientFirstName(event.target.value)} />
        <Input description={props.errors.recipientLastName} label="نام خانوادگی گیرنده" required status={props.errors.recipientLastName ? "error" : "default"} value={props.recipientLastName} onChange={(event) => props.onRecipientLastName(event.target.value)} />
      </div> : <p className="m-0 text-label-14 text-surface-neutral-mid-emphasis">سفارش به نام و مشخصات حساب کاربری شما ارسال می‌شود.</p>}
      {!receiverIsSender ? <Input className="mt-12" description={props.errors.recipientPhone} dir="ltr" inputMode="tel" label="شماره موبایل گیرنده" placeholder="09121234567" required status={props.errors.recipientPhone ? "error" : "default"} value={props.recipientPhone} onChange={(event) => props.onRecipientPhone(event.target.value)} /> : null}
    </section>

    <Divider size="md" variant="spacer" />

    <SectionHeader
      as="h2"
      leftSlot={<Button size="small" variant="tertiary-outline" onClick={props.onAddressSheetOpen}><Plus aria-hidden="true" /> افزودن آدرس جدید</Button>}
      subtitle="نشانی که کادو به آن ارسال می‌شود."
      title="آدرس دریافت سفارش"
    />
    <section className="px-16 pb-16">
      <p className="mb-12 mt-0 text-label-14 text-surface-neutral-mid-emphasis">انتخاب آدرس</p>
      {props.addresses.length ? <RadioGroup value={props.selectedAddressId} onValueChange={props.onSelectAddress}>
        {props.addresses.map((address) => <SavedAddressCard key={address.id} address={address} busy={props.removingAddressId === address.id} onDelete={props.onDeleteAddress} onEdit={props.onEditAddress} selectable />)}
      </RadioGroup> : <div className="rounded-m border border-dashed border-border-high-emphasis px-16 py-20 text-label-14 text-surface-neutral-mid-emphasis">هنوز نشانی‌ای ثبت نکرده‌اید. برای ادامه، یک آدرس جدید اضافه کنید.</div>}
    </section>
  </>;
}

function DeliveryStep(props: {
  state: CheckoutState; deliverySlotId: string; packagingId: "gift" | "normal"; postcardText: string; pendingRate: string | null;
  onDeliverySlot: (value: string) => void; onPackaging: (value: "gift" | "normal") => void; onPostcard: (value: string) => void; onShippingRate: (packageId: number, rateId: string) => void;
}) {
  return <>
    <SectionHeader as="h2" subtitle="بازه زمانی تحویل را انتخاب کنید." title="انتخاب زمان دریافت" />
    <section className="px-16 pb-16">
      <div className="flex snap-x snap-mandatory gap-16 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {props.state.deliverySlots.map((slot) => {
          const selected = slot.id === props.deliverySlotId;
          const date = deliveryDate(slot.date);
          return <button
            key={slot.id}
            aria-pressed={selected}
            className={`grid h-[140px] w-[148px] shrink-0 snap-start place-items-center rounded-m border bg-surface-background p-12 text-center transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 ${selected ? "border-2 border-secondary shadow-[0_0_0_4px_var(--color-secondary-container)]" : "border-border-high-emphasis"}`}
            type="button"
            onClick={() => props.onDeliverySlot(slot.id)}
          >
            <span className="text-label-14 text-surface-neutral-mid-emphasis">{date.weekday}</span>
            <span className="text-body-16 font-bold">{date.date}</span>
            <span className="text-label-14 font-bold">{deliveryPart(slot.startHour)}</span>
            <span className="text-label-14 text-surface-neutral-mid-emphasis">{slot.startHour} الی {slot.endHour}</span>
          </button>;
        })}
      </div>
    </section>

    {props.state.cart.shippingRates.map((group) => group.rates.length > 1 ? <div key={group.packageId}>
      <Divider size="md" variant="spacer" />
      <SectionHeader as="h2" subtitle="روش ارسال سفارش را انتخاب کنید." title="شیوه ارسال" />
      <section className="px-16 pb-16">
        <RadioGroup value={group.selectedRate ?? ""} onValueChange={(value) => props.onShippingRate(group.packageId, value)}>
          {group.rates.map((rate) => <RadioGroupItem
            key={rate.rateId}
            className="w-full rounded-m border border-border-high-emphasis p-16 has-[[data-state=checked]]:border-2 has-[[data-state=checked]]:border-secondary has-[[data-state=checked]]:shadow-[0_0_0_4px_var(--color-secondary-container)]"
            disabled={props.pendingRate !== null}
            label={<span className="flex w-full items-center justify-between gap-12 text-body-14"><span>{rate.name}</span><span>{formatIrrAsToman(rate.price)}</span></span>}
            value={rate.rateId}
          />)}
        </RadioGroup>
      </section>
    </div> : null)}

    <Divider size="md" variant="spacer" />
    <SectionHeader as="h2" subtitle="بسته‌بندی سفارش خود را انتخاب کنید" title="انتخاب نوع بسته‌بندی" />
    <section className="px-16 pb-16">
      <div className="grid gap-16 min-[420px]:grid-cols-2">
        {props.state.packagingOptions.map((option) => {
          const selected = option.id === props.packagingId;
          return <button
            key={option.id}
            aria-pressed={selected}
            className={`grid min-h-[190px] content-center justify-items-center gap-8 rounded-m border bg-surface-background p-16 text-center transition-[border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/30 ${selected ? "border-2 border-secondary shadow-[0_0_0_4px_var(--color-secondary-container)]" : "border-border-high-emphasis"}`}
            type="button"
            onClick={() => props.onPackaging(option.id)}
          >
            <Image alt="" className="size-56 object-contain" height={56} src={option.imageUrl} width={56} />
            <span className="text-body-16 font-bold">{option.label}</span>
            <span className="text-label-14 text-surface-neutral-mid-emphasis">{option.id === "gift" ? "کاغذ کادو، روبان، پوشال و کارت" : "جعبه مقوایی پستی"}</span>
            {option.fee.amount !== "0" ? <span className="text-label-14 text-surface-neutral-mid-emphasis">{formatIrrAsToman(option.fee)}</span> : null}
          </button>;
        })}
      </div>
    </section>

    <Divider size="md" variant="spacer" />
    <SectionHeader as="h2" subtitle="یک پیام کوتاه برای قرار گرفتن داخل کادو" title="متن کارت پستال" />
    <section className="px-16 pb-16">
      <TextArea label="متن کارت پستال" maxLength={500} placeholder="پیام شما…" showCount value={props.postcardText} onChange={(event) => props.onPostcard(event.target.value)} />
    </section>
  </>;
}

function PaymentStep({ state, couponPending, onApplyCoupon, onRemoveCoupon }: {
  state: CheckoutState; couponPending: string | null; onApplyCoupon: (code: string) => Promise<boolean>; onRemoveCoupon: (code: string) => Promise<void>;
}) {
  const [couponCode, setCouponCode] = useState("");
  const hasCoupon = state.cart.coupons.length > 0;
  const submitCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    if (await onApplyCoupon(code)) setCouponCode("");
  };

  return <>
    <SectionHeader as="h2" title="شیوه پرداخت" />
    <section className="px-16 pb-16">
      <RadioGroup className="gap-0" value={state.paymentMethod.id}>
        <RadioGroupItem
          className="w-full rounded-m border-2 border-secondary p-16 shadow-[0_0_0_4px_var(--color-secondary-container)]"
          label={<span className="grid gap-4"><span className="text-title-14 font-bold">پرداخت آنلاین</span><span className="text-label-12 text-surface-neutral-mid-emphasis">از طریق درگاه پرداخت الکترونیک</span></span>}
          value={state.paymentMethod.id}
        />
      </RadioGroup>
    </section>

    <Divider size="md" variant="spacer" />
    <SectionHeader as="h2" title="کد تخفیف" />
    <section className="px-16 pb-16">
      {!hasCoupon ? <div className="flex items-end gap-12">
        <Input
          aria-label="کد تخفیف"
          className="min-w-0 flex-1"
          dir="ltr"
          placeholder="WELCOME10"
          value={couponCode}
          onChange={(event) => setCouponCode(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submitCoupon();
            }
          }}
        />
        <Button disabled={!couponCode.trim() || couponPending !== null} loading={couponPending === "apply"} size="large" variant="secondary-tonal" onClick={() => void submitCoupon()}>
          اعمال
        </Button>
      </div> : null}
      {hasCoupon ? <div className="flex flex-wrap gap-8" aria-label="کدهای تخفیف اعمال‌شده">
        {state.cart.coupons.map((coupon) => <Chip
          key={coupon.code}
          disabled={couponPending !== null}
          removeLabel={`حذف کد تخفیف ${coupon.code}`}
          size="md"
          variant="selected"
          onRemove={() => void onRemoveCoupon(coupon.code)}
        >{coupon.code}</Chip>)}
      </div> : null}
    </section>

    <Divider size="md" variant="spacer" />
    <SectionHeader as="h2" subtitle="مشخصات هزینه‌های سفارش" title="جزئیات پرداخت" />
    <section className="px-16 pb-16 text-body-14">
      <PaymentRow label="جمع سفارش‌ها" value={formatIrrAsToman(state.cart.totals.totalItems)} />
      <Divider />
      <PaymentRow label="هزینه ارسال" value={formatIrrAsToman(state.cart.totals.totalShipping)} />
      <Divider />
      <PaymentRow label="مالیات بر ارزش افزوده (۱۰٪)" value={formatIrrAsToman(state.cart.totals.totalTax)} />
      {state.cart.totals.totalDiscount.amount !== "0" ? <><Divider /><PaymentRow className="text-success" label="تخفیف" value={`− ${formatIrrAsToman(state.cart.totals.totalDiscount)}`} /></> : null}
      <Divider />
      <PaymentRow bold label="جمع کل" value={formatIrrAsToman(state.cart.totals.totalPrice)} />
    </section>
  </>;
}

function PaymentRow({ label, value, bold = false, className = "" }: { label: string; value: string; bold?: boolean; className?: string }) {
  return <div className={`flex min-h-56 items-center justify-between gap-16 ${bold ? "text-title-18 font-bold" : ""} ${className}`}><span>{label}</span><span className="text-left">{value}</span></div>;
}

function CheckoutFooter({ canContinue, nextPending, onNext, onPay, onPrevious, reconciliationUnknown, step, submitting }: {
  canContinue: boolean; nextPending: boolean; onNext: () => void | Promise<void>; onPay: () => void; onPrevious: () => void; reconciliationUnknown: boolean; step: number; submitting: boolean;
}) {
  const isPayment = step === 2;
  return <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border-mid-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-16 shadow-[0_-8px_24px_rgba(0,0,0,.04)]">
    <div className={isPayment || step > 0 ? "mx-auto grid max-w-[580px] grid-cols-[minmax(0,1fr)_106px] gap-12" : "mx-auto max-w-[580px]"}>
      <Button className="w-full" disabled={isPayment ? reconciliationUnknown : !canContinue || nextPending} loading={isPayment ? submitting : nextPending} onClick={isPayment ? onPay : onNext} size="large" variant="primary-filled">
        {isPayment ? "پرداخت" : "مرحله بعد"}
      </Button>
      {step > 0 ? <Button disabled={submitting} onClick={onPrevious} size="large" variant="tertiary-outline">مرحله قبل</Button> : null}
    </div>
  </div>;
}
