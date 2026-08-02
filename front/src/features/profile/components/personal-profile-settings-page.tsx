"use client";

import Link from "next/link";
import { Copy, Eye, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import { Alert } from "@/components/ui/alert";
import { Divider } from "@/components/ui/divider";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { getPersonalProfile, updatePersonalProfile } from "../services/profile";
import type { PersonalProfile } from "../types";
import { getProfileCompletion } from "../utils/profile-completion";

const emptyProfile: PersonalProfile = {
  username: null,
  enabled: false,
  showAvatar: true,
  showFirstName: true,
  showLastName: true,
  showBirthDate: false,
  showWishlist: true,
};

type SettingToggleProps = {
  label: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
};

function SettingToggle({ label, checked, onCheckedChange }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between gap-16 py-12">
      <span className="text-title-16 font-bold text-surface-neutral-high-emphasis">{label}</span>
      <Toggle aria-label={label} checked={checked} onCheckedChange={onCheckedChange} tone="secondary" />
    </div>
  );
}

export function PersonalProfileSettingsPage() {
  const router = useRouter();
  const { customer, status } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<PersonalProfile | null>(null);
  const [draft, setDraft] = useState<PersonalProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (status !== "authenticated") return;
    setLoading(true);
    setError(false);
    try {
      const next = await getPersonalProfile();
      setProfile(next);
      setDraft(next);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load, status]);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login?next=/profile/personal-profile");
  }, [router, status]);

  const profileInformationIncomplete = customer ? getProfileCompletion(customer).level === "newcomer" : true;

  const update = <K extends keyof PersonalProfile>(key: K, value: PersonalProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (profileInformationIncomplete) return;
    setSaving(true);
    try {
      const next = await updatePersonalProfile({
        ...draft,
        username: draft.username?.trim().toLowerCase() || null,
      });
      setProfile(next);
      setDraft(next);
      toast({ tone: "success", title: "تنظیمات پروفایل ذخیره شد" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "لطفاً دوباره تلاش کنید.";
      toast({ tone: "error", title: "ذخیره تنظیمات انجام نشد", description: message });
    } finally {
      setSaving(false);
    }
  };

  const copyProfileUrl = async () => {
    if (!profile?.username) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profiles/${profile.username}`);
      toast({ tone: "success", title: "لینک صفحه عمومی کپی شد" });
    } catch {
      toast({ tone: "error", title: "کپی لینک انجام نشد" });
    }
  };

  if (status === "loading" || (status === "authenticated" && loading)) {
    return <div className="grid gap-16 px-16 py-24"><div className="h-56 animate-pulse rounded-m bg-surface" /><div className="h-48 animate-pulse rounded-m bg-surface" /><div className="h-48 animate-pulse rounded-m bg-surface" /></div>;
  }

  if (status === "anonymous") return null;

  if (status === "error" || error) {
    return <StateMessage actions={<Button onClick={() => void load()} variant="secondary-filled"><RefreshCw aria-hidden /> تلاش مجدد</Button>} imageSrc="/images/illustration-failed.png" subtitle="لطفاً دوباره تلاش کنید." title="خطا در بارگذاری تنظیمات" />;
  }

  const profileUrl = profile?.username ? `/profiles/${profile.username}` : null;

  return (
    <div className="min-h-dvh bg-surface-background [direction:rtl]">
      <Header backUrl="/profile" title="تنظیمات پروفایل شخصی" variant="internal" />
      <main className="mx-auto w-full max-w-[720px] pb-[calc(var(--spacing-128)+max(env(safe-area-inset-bottom),var(--spacing-24)))]">
        {profileInformationIncomplete ? <div className="px-16 pt-16"><Alert title="ابتدا اطلاعات حساب را تکمیل کنید" tone="info">برای فعال‌سازی پروفایل شخصی، ابتدا اطلاعات حساب کاربری را کامل کنید تا به سطح کاربر عادی برسید.</Alert></div> : null}
        <section className="px-16 py-24">
          <div className="flex items-center justify-between gap-16">
            <div className="grid gap-4 text-right">
              <h2 className="m-0 text-title-18 font-bold text-surface-neutral-high-emphasis">پروفایل شخصی</h2>
              <p className="m-0 text-label-12 text-surface-neutral-mid-emphasis">با فعال کردن این گزینه، صفحه اختصاصی شما برای عموم در دسترس خواهد بود.</p>
            </div>
            <Toggle aria-label="فعال‌سازی پروفایل شخصی" checked={draft.enabled} disabled={profileInformationIncomplete} onCheckedChange={(value) => update("enabled", value)} tone="secondary" />
          </div>
        </section>

        {draft.enabled ? (
          <>
            <Divider size="md" variant="spacer" />
            <section className="px-16 py-20">
              <Input
                description="فقط از حروف انگلیسی کوچک، عدد و خط تیره استفاده کنید. این نام قابل تغییر است."
                label="نام کاربری"
                maxLength={30}
                onChange={(event) => update("username", event.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
                placeholder="یک نام کاربری انتخاب کنید"
                required
                status={draft.username ? "default" : "error"}
                value={draft.username ?? ""}
              />
            </section>

            {profileUrl ? (
              <>
                <Divider size="md" variant="spacer" />
                <section className="px-16 py-20">
                  <div className="grid gap-8">
                    <p className="m-0 text-label-12 text-surface-neutral-mid-emphasis">آدرس پروفایل اختصاصی شما</p>
                    <div className="flex items-center gap-8" dir="ltr">
                      <Input aria-label="لینک پروفایل شخصی" className="min-w-0 flex-1" dir="ltr" disabled readOnly value={profileUrl} />
                      <Button aria-label="کپی لینک پروفایل" onClick={() => void copyProfileUrl()} size="large" variant="tertiary-outline"><Copy aria-hidden /> کپی</Button>
                    </div>
                  </div>
                </section>
              </>
            ) : null}

            <Divider size="md" variant="spacer" />
            <section className="px-16 py-12">
              <SettingToggle checked={draft.showAvatar} label="نمایش تصویر پروفایل" onCheckedChange={(value) => update("showAvatar", value)} />
              <SettingToggle checked={draft.showFirstName} label="نمایش نام" onCheckedChange={(value) => update("showFirstName", value)} />
              <SettingToggle checked={draft.showLastName} label="نمایش نام خانوادگی" onCheckedChange={(value) => update("showLastName", value)} />
              <SettingToggle checked={draft.showBirthDate} label="نمایش تاریخ تولد" onCheckedChange={(value) => update("showBirthDate", value)} />
              <SettingToggle checked={draft.showWishlist} label="نمایش لیست مورد علاقه‌ها" onCheckedChange={(value) => update("showWishlist", value)} />
            </section>
          </>
        ) : null}

      </main>
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center border-t border-border-mid-emphasis bg-surface-background p-16 pb-[max(env(safe-area-inset-bottom),var(--spacing-24))]">
        <div className="flex w-full max-w-[688px] flex-col gap-12 min-[580px]:flex-row">
          {profileUrl && draft.enabled ? <Button asChild className="w-full min-[580px]:flex-1" size="large" variant="tertiary-outline"><Link href={profileUrl} rel="noreferrer" target="_blank"><Eye aria-hidden /> مشاهده صفحه اختصاصی</Link></Button> : null}
          <Button className="w-full min-[580px]:flex-1" disabled={profileInformationIncomplete || (draft.enabled && !draft.username)} loading={saving} onClick={() => void save()} size="large" variant="primary-filled">
            {profile?.username ? "ذخیره تنظیمات" : "ایجاد صفحه اختصاصی"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PersonalProfileSettingsPage;
