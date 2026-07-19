"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { ServiceError } from "@/lib/http/errors";
import { updateProfile } from "../services/profile";

function saveErrorMessage(error: unknown) {
  if (error instanceof ServiceError && error.detail.code === "validation") return "نام واردشده معتبر نیست.";
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
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer || saving) return;
    try {
      setSaving(true);
      await updateProfile({ firstName, lastName });
      await refresh();
      toast({ title: "ذخیره شد", description: "اطلاعات حساب کاربری شما به‌روزرسانی شد.", tone: "success" });
      onSaved();
    } catch (error) {
      toast({ title: "خطا", description: saveErrorMessage(error), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return <form className="grid gap-12" noValidate onSubmit={handleSubmit}>
    <Input autoComplete="given-name" label="نام" maxLength={100} name="firstName" onChange={(event) => setFirstName(event.currentTarget.value)} value={firstName} />
    <Input autoComplete="family-name" label="نام خانوادگی" maxLength={100} name="lastName" onChange={(event) => setLastName(event.currentTarget.value)} value={lastName} />
    <Input disabled dir="ltr" label="شماره موبایل" name="phone" value={customer.phone} />
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border-mid-emphasis bg-surface-background p-16 pb-[calc(var(--spacing-32)+env(safe-area-inset-bottom))]">
      <Button className="mx-auto w-full max-w-[580px]" loading={saving} size="large" type="submit">ثبت اطلاعات</Button>
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
      <main className="mx-auto w-full max-w-[600px] px-16 py-16 pb-160">
        {status === "error" ? (
          <div className="grid place-items-center py-48 text-center text-body-14 text-surface-neutral-mid-emphasis">دریافت اطلاعات حساب کاربری با مشکل مواجه شد. دوباره تلاش کنید.</div>
        ) : status === "loading" || !customer ? (
          <div className="grid gap-12"><div className="h-80 animate-pulse rounded-m bg-surface" /><div className="h-80 animate-pulse rounded-m bg-surface" /><div className="h-80 animate-pulse rounded-m bg-surface" /></div>
        ) : <ProfileInfoForm customer={customer} key={customer.id} onSaved={() => router.replace("/profile")} />}
      </main>
    </div>
  );
}
