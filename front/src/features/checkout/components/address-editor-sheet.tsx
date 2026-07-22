"use client";

import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { BottomSheet, BottomSheetContent, BottomSheetDescription, BottomSheetHeader, BottomSheetTitle } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TextArea } from "@/components/ui/textarea";
import type { CreateSavedAddressInput, SavedAddress } from "../types";
import { LocationPickerMap, type DeliveryLocation } from "./location-picker-map";

export function AddressEditorSheet({
  address,
  open,
  onOpenChange,
  onSave,
}: {
  address?: SavedAddress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (address: CreateSavedAddressInput) => Promise<void>;
}) {
  return <AddressEditorSheetForm key={`${open}-${address?.id ?? "new"}`} address={address} open={open} onOpenChange={onOpenChange} onSave={onSave} />;
}

function AddressEditorSheetForm({
  address,
  open,
  onOpenChange,
  onSave,
}: {
  address?: SavedAddress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (address: CreateSavedAddressInput) => Promise<void>;
}) {
  const [title, setTitle] = useState(address?.title ?? "");
  const [address1, setAddress1] = useState(address?.address1 ?? "");
  const [address2, setAddress2] = useState(address?.address2 ?? "");
  const [location, setLocation] = useState<DeliveryLocation | null>(address?.location ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(address);

  const save = async () => {
    const normalizedAddress = address1.trim();
    if (normalizedAddress.length < 5) {
      setError("نشانی گیرنده را کامل وارد کنید.");
      return;
    }
    const fallbackTitle = (normalizedAddress.split(/[،,]/)[0]?.trim() || normalizedAddress).slice(0, 100);
    setSaving(true);
    try {
      await onSave({
        title: title.trim() || fallbackTitle,
        address1: normalizedAddress,
        address2: address2.trim(),
        location,
      });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "ذخیره آدرس انجام نشد.");
    } finally {
      setSaving(false);
    }
  };

  return <BottomSheet open={open} onOpenChange={onOpenChange}>
    <BottomSheetContent
      footer={<div className="border-t border-border-mid-emphasis bg-surface-background px-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))] pt-16"><Button className="w-full" loading={saving} size="large" variant="primary-filled" onClick={() => void save()}>{editing ? "ذخیره تغییرات" : "ذخیره آدرس"}</Button></div>}
      size="md"
    >
      <BottomSheetHeader>
        <BottomSheetTitle className="m-0 text-title-18 font-bold">{editing ? "ویرایش آدرس" : "افزودن آدرس جدید"}</BottomSheetTitle>
        <BottomSheetDescription className="m-0 text-label-14 text-surface-neutral-mid-emphasis">نشانی دریافت سفارش را وارد کنید.</BottomSheetDescription>
      </BottomSheetHeader>
      <div className="space-y-16 px-16 pb-16">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Input label="عنوان آدرس" placeholder="مثلاً خانه، محل کار" value={title} onChange={(event) => setTitle(event.target.value)} />
        <Input description="در حال حاضر کادوچی فقط در شهر تهران فعال است." disabled label="انتخاب شهر" value="تهران" />
        <TextArea label="آدرس گیرنده" maxLength={200} placeholder="خیابان، کوچه، پلاک، واحد…" required showCount value={address1} onChange={(event) => setAddress1(event.target.value)} />
        <Input label="توضیحات" value={address2} onChange={(event) => setAddress2(event.target.value)} />
        <LocationPickerMap value={location} onChange={setLocation} />
      </div>
    </BottomSheetContent>
  </BottomSheet>;
}
