"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { ServiceError } from "@/lib/http/errors";
import { updateProfile } from "../services/profile";
import { ProfileAvatarEditor } from "./profile-avatar-editor";
import { PersianBirthdayPicker } from "./persian-birthday-picker";

type Gender = "female" | "male" | "undisclosed";

function saveErrorMessage(error: unknown) {
  if (error instanceof ServiceError && error.detail.code === "validation") return "اطلاعات واردشده معتبر نیست.";
  return "ذخیره اطلاعات انجام نشد. دوباره تلاش کنید.";
}

function ProfileInfoForm({
  customer,
  onSaved,
}: {
  customer: NonNullable<ReturnType<typeof useAuth>["customer"]>;
  onSaved: () => void;
}) {
  const { refresh } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(customer.firstName);
  const [lastName, setLastName] = useState(customer.lastName);
  const [avatarData, setAvatarData] = useState<string | null>();
  const [birthDate, setBirthDate] = useState(customer.birthDate ?? "");
  const [gender, setGender] = useState<Gender | "">(customer.gender ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || saving) return;
    try {
      setSaving(true);
      await updateProfile({ firstName, lastName, birthDate: birthDate || null, gender: gender || null, ...(avatarData !== undefined ? { avatarData } : {}) });
      await refresh();
      toast({ title: "ذخیره شد", description: "اطلاعات حساب کاربری شما به‌روزرسانی شد.", tone: "success" });
      onSaved();
    } catch (error) {
      toast({ title: "خطا", description: saveErrorMessage(error), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ").trim() || customer.displayName || customer.phone;

  return <form className="grid gap-12" noValidate onSubmit={handleSubmit}>
    <ProfileAvatarEditor alt={displayName} initialSrc={customer.avatarSrc} onChange={setAvatarData} onError={(description) => toast({ title: "خطا در انتخاب عکس", description, tone: "error" })} />
    <Input autoComplete="given-name" label="نام" maxLength={100} name="firstName" onChange={(event) => setFirstName(event.currentTarget.value)} value={firstName} />
    <Input autoComplete="family-name" label="نام خانوادگی" maxLength={100} name="lastName" onChange={(event) => setLastName(event.currentTarget.value)} value={lastName} />
    <PersianBirthdayPicker onChange={setBirthDate} value={birthDate} />
    <fieldset className="grid gap-16 border-0 py-16" dir="rtl">
      <legend className="p-0 text-label-12 font-regular text-surface-neutral-mid-emphasis">جنسیت</legend>
      <RadioGroup aria-label="جنسیت" className="grid w-full grid-cols-3 gap-8" onValueChange={(value) => setGender(value as Gender)} value={gender}>
        <RadioGroupItem className="flex h-56 w-full min-w-0 justify-center gap-6 rounded-m border border-border-high-emphasis bg-surface-background px-8 text-label-14" label="زن" value="female" />
        <RadioGroupItem className="flex h-56 w-full min-w-0 justify-center gap-6 rounded-m border border-border-high-emphasis bg-surface-background px-8 text-label-14" label="مرد" value="male" />
        <RadioGroupItem className="flex h-56 w-full min-w-0 justify-center gap-6 rounded-m border border-border-high-emphasis bg-surface-background px-8 text-label-14" label="سایر" value="undisclosed" />
      </RadioGroup>
    </fieldset>
    <Input disabled dir="ltr" label="شماره موبایل" name="phone" value={customer.phone} />
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center border-t border-border-mid-emphasis bg-surface-background p-16 pb-[calc(var(--spacing-32)+env(safe-area-inset-bottom))]">
      <Button className="w-full max-w-[580px]" loading={saving} size="large" type="submit">ثبت اطلاعات</Button>
    </div>
  </form>;
}

export function ProfileInfoPage() {
  const router = useRouter();
  const { customer, status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login?next=/profile/info");
  }, [router, status]);

  return (
    <div className="min-h-dvh bg-surface-background" dir="rtl">
      <Header backUrl="/profile" title="اطلاعات حساب کاربری" variant="internal" />
      <main className="mx-auto w-full max-w-[600px] px-16 py-16 pb-[calc(var(--spacing-128)+env(safe-area-inset-bottom))]">
        {status === "error" ? (
          <div className="grid place-items-center py-48 text-center text-body-14 text-surface-neutral-mid-emphasis">دریافت اطلاعات حساب کاربری با مشکل مواجه شد. دوباره تلاش کنید.</div>
        ) : status === "loading" || !customer ? (
          <div className="grid gap-12"><div className="h-80 animate-pulse rounded-m bg-surface" /><div className="h-80 animate-pulse rounded-m bg-surface" /><div className="h-80 animate-pulse rounded-m bg-surface" /></div>
        ) : <ProfileInfoForm customer={customer} key={customer.id} onSaved={() => router.replace("/profile")} />}
      </main>
    </div>
  );
}
