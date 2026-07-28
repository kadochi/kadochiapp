"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LayoutAuth } from "@/components/layout/layout-auth";
import { ServiceError } from "@/lib/http/errors";
import { iranianPhoneSchema } from "../schema/auth";
import type { OtpStartResponse } from "../types";
import { useAuth } from "../auth-provider";

type PhoneLoginFormProps = {
  initialPhone?: string;
  onStarted: (phone: string, challenge: OtpStartResponse) => void;
};

function latinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function startErrorMessage(error: unknown): string {
  if (error instanceof ServiceError) {
    if (error.detail.code === "otp_rate_limited") return "تعداد درخواست‌های ارسال کد زیاد است. کمی بعد دوباره تلاش کنید.";
    if (error.detail.code === "otp_cooldown") return "کد قبلی هنوز معتبر است. لطفاً چند لحظه دیگر دوباره تلاش کنید.";
    if (error.detail.code === "validation") return "در حالت توسعه از شماره نمونه نمایش‌داده‌شده استفاده کنید.";
    if (error.detail.retryable) return "ارتباط با سرویس ورود برقرار نشد. دوباره تلاش کنید.";
  }
  return "ارسال کد با مشکل مواجه شد. دوباره تلاش کنید.";
}

export function PhoneLoginForm({ initialPhone = "", onStarted }: PhoneLoginFormProps) {
  const { startOtp } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => setSecondsLeft((current) => Math.max(0, current - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = iranianPhoneSchema.safeParse(phone);
    if (!parsed.success) {
      setError("شماره موبایل معتبر وارد کنید؛ مانند ۰۹۱۲۱۲۳۴۵۶۷.");
      return;
    }

    try {
      setLoading(true);
      const challenge = await startOtp({ phone: parsed.data });
      onStarted(phone, challenge);
    } catch (caught) {
      if (caught instanceof ServiceError && caught.detail.retryAfter !== undefined) {
        setSecondsLeft(Math.ceil(caught.detail.retryAfter));
      }
      setError(startErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LayoutAuth
      title="ورود / عضویت"
      description="شماره موبایل خود را وارد کنید تا کد تأیید یک‌بار مصرف برایتان ارسال شود."
    >
      <form className="flex w-full flex-col items-center gap-32" noValidate onSubmit={handleSubmit}>
        <div className="w-full px-24">
          <Input
            autoComplete="tel-national"
            autoFocus
            description={error ?? undefined}
            dir="ltr"
            inputMode="numeric"
            label="شماره موبایل"
            maxLength={11}
            name="phone"
            onChange={(event) => {
              setError(null);
              setSecondsLeft(0);
              setPhone(latinDigits(event.currentTarget.value).replace(/\D/g, "").slice(0, 11));
            }}
            placeholder="مثال 09121234567"
            required
            status={error ? "error" : "default"}
            value={phone}
          />
        </div>

        <div className="-mt-8 mb-8 w-full px-24" dir="rtl">
          <Checkbox
            aria-readonly="true"
            checked
            label={
              <span className="leading-[var(--text-body-12--line-height)] text-surface-neutral-mid-emphasis">
                ورود و عضویت در کادوچی به منزله‌ی مطالعه و پذیرش{` `}
                <Link className="font-bold text-secondary no-underline" href="/terms">قوانین و مقررات</Link>
                {` `}و{` `}
                <Link className="font-bold text-secondary no-underline" href="/privacy">حفظ حریم خصوصی</Link>
                {` `}می‌باشد.
              </span>
            }
            onCheckedChange={() => undefined}
          />
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col items-center border-t border-border-mid-emphasis bg-surface-background p-16 pb-[max(var(--spacing-24),env(safe-area-inset-bottom))]">
          <Button className="mx-auto w-full max-w-[580px]" disabled={secondsLeft > 0} loading={loading} size="large" type="submit">
            ارسال کد یک‌بار مصرف
          </Button>
          {secondsLeft > 0 ? <p className="m-0 mt-8 text-body-12 text-surface-neutral-mid-emphasis">امکان ارسال مجدد تا {secondsLeft} ثانیه دیگر</p> : null}
        </div>
      </form>
    </LayoutAuth>
  );
}
