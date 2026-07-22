"use client";

import Link from "next/link";
import { Copy, Eye, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Header } from "@/components/layout/header";
import StateMessage from "@/components/layout/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { useToast } from "@/components/ui/toaster";
import { useAuth } from "@/features/auth/auth-provider";
import { getPersonalProfile, updatePersonalProfile } from "../services/profile";
import type { PersonalProfile } from "../types";

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
  const { status } = useAuth();
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
    if (status === "anonymous") router.replace("/login?next=/profile/wishlist/personal-profile");
  }, [router, status]);

  const update = <K extends keyof PersonalProfile>(key: K, value: PersonalProfile[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
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
      <Header backUrl="/profile/wishlist" title="تنظیمات پروفایل شخصی" variant="internal" />
      <main className="mx-auto w-full max-w-[720px] pb-32">
        <section className="px-16 py-24">
          <div className="flex items-center justify-between gap-16">
            <div className="grid gap-4 text-right">
              <h2 className="m-0 text-title-18 font-bold text-surface-neutral-high-emphasis">پروفایل شخصی</h2>
              <p className="m-0 text-label-12 text-surface-neutral-mid-emphasis">با فعال کردن این گزینه، صفحه اختصاصی شما برای عموم در دسترس خواهد بود.</p>
            </div>
            <Toggle aria-label="فعال‌سازی پروفایل شخصی" checked={draft.enabled} onCheckedChange={(value) => update("enabled", value)} tone="secondary" />
          </div>
        </section>

        {draft.enabled ? (
          <>
            <section className="border-y-8 border-surface px-16 py-20">
              <Input
                description="فقط از حروف انگلیسی کوچک، عدد و خط تیره استفاده کنید. این نام قابل تغییر است."
                label="نام کاربری"
                maxLength={30}
                onChange={(event) => update("username", event.target.value.replace(/[^a-zA-Z0-9-]/g, "").toLowerCase())}
                placeholder="مثلاً aidin"
                required
                status={draft.username ? "default" : "error"}
                value={draft.username ?? ""}
              />
            </section>

            {profileUrl ? (
              <section className="border-b-8 border-surface px-16 py-20">
                <div className="grid gap-8">
                  <p className="m-0 text-label-12 text-surface-neutral-mid-emphasis">آدرس پروفایل اختصاصی شما</p>
                  <div className="flex items-center gap-8" dir="ltr">
                    <Input aria-label="لینک پروفایل شخصی" className="min-w-0 flex-1" dir="ltr" disabled readOnly value={profileUrl} />
                    <Button aria-label="کپی لینک پروفایل" onClick={() => void copyProfileUrl()} size="large" variant="tertiary-outline"><Copy aria-hidden /> کپی</Button>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="px-16 py-12">
              <SettingToggle checked={draft.showAvatar} label="نمایش تصویر پروفایل" onCheckedChange={(value) => update("showAvatar", value)} />
              <SettingToggle checked={draft.showFirstName} label="نمایش نام" onCheckedChange={(value) => update("showFirstName", value)} />
              <SettingToggle checked={draft.showLastName} label="نمایش نام خانوادگی" onCheckedChange={(value) => update("showLastName", value)} />
              <SettingToggle checked={draft.showBirthDate} label="نمایش تاریخ تولد" onCheckedChange={(value) => update("showBirthDate", value)} />
              <SettingToggle checked={draft.showWishlist} label="نمایش لیست مورد علاقه‌ها" onCheckedChange={(value) => update("showWishlist", value)} />
            </section>
          </>
        ) : null}

        <div className="flex flex-col gap-12 border-t border-border-low-emphasis px-16 pt-16">
          {profileUrl && draft.enabled ? <Button asChild className="w-full" size="large" variant="tertiary-outline"><Link href={profileUrl} rel="noreferrer" target="_blank"><Eye aria-hidden /> مشاهده صفحه اختصاصی</Link></Button> : null}
          <Button className="w-full" disabled={draft.enabled && !draft.username} loading={saving} onClick={() => void save()} size="large" variant="primary-filled">
            {profile?.username ? "ذخیره تنظیمات" : "ایجاد صفحه اختصاصی"}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default PersonalProfileSettingsPage;
