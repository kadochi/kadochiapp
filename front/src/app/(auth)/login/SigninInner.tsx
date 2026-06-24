"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button/Button";
import Input from "@/components/ui/Input/Input";
import Checkbox from "@/components/ui/Checkbox/Checkbox";
import Link from "next/link";
import { apiStartOtp } from "@/modules/auth/services/otp";
import { normalizeDigits } from "@/lib/utils/normalizeDigits";
import {
  isLocalDevHost,
  OTP_DEV_CODE_HINT,
  OTP_DEV_PHONE_HINT,
} from "@/modules/auth/services/otp";

type Props = {
  onSubmit: (phone: string) => void;
  initialPhone?: string;
};

export default function SigninInner({ onSubmit, initialPhone = "" }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const showDevHint = isLocalDevHost();

  async function handleSend() {
    setErr(null);
    const clean = normalizeDigits(phone).replace(/\D/g, "");
    if (clean.length !== 11 || !clean.startsWith("0")) {
      setErr("شماره موبایل نامعتبر است.");
      return;
    }
    try {
      setLoading(true);
      await apiStartOtp(clean);
      onSubmit(clean);
    } catch {
      setErr("ارسال کد با مشکل مواجه شد. بعداً تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={cn("bg-surface-background max-w-[580px] mx-auto")}>
      <form
        className={cn("grid gap-8 pt-20 pb-[120px]")}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <div className={cn("mt-20 px-6 grid gap-2")}>
          <h1 className={cn("mb-3 font-sans text-title-18 leading-title-18 font-bold text-text-primary")}>ورود / عضویت</h1>
          <p className={cn("m-0 font-sans text-body-16 leading-body-16 text-text-secondary")}>
            شماره موبایل خود را وارد کنید تا کد تایید برایتان ارسال شود.
          </p>
          {showDevHint && (
            <p className={cn("m-0 font-sans text-body-16 leading-body-16 text-text-secondary")}>
              توسعه محلی: از شماره{" "}
              <span dir="ltr">{OTP_DEV_PHONE_HINT}</span> و کد{" "}
              <span dir="ltr">{OTP_DEV_CODE_HINT}</span> استفاده کنید.
            </p>
          )}
        </div>

        <div className={cn("px-6")}>
          <Input
            dir="ltr"
            showLabel
            label="شماره موبایل"
            placeholder="09121234567 مثال"
            value={phone}
            onChange={(e) => {
              const val = normalizeDigits(e.currentTarget.value).replace(
                /\D/g,
                ""
              );
              setPhone(val.slice(0, 11));
            }}
            message={err ?? undefined}
            messageType={err ? "error" : undefined}
          />
        </div>

        <div className={cn("px-6 -mt-2 mb-2")}>
          <Checkbox
            checked
            name="accept_terms"
            label={
              <span className={cn("font-sans text-label-12 leading-label-12 text-text-secondary")}>
                ورود و عضویت در کادوچی به منزله‌ی مطالعه و پذیرش{" "}
                <Link href="/terms" className={cn("text-secondary font-bold no-underline")}>
                  قوانین و مقررات
                </Link>{" "}
                و{" "}
                <Link href="/privacy" className={cn("text-secondary font-bold no-underline")}>
                  حفظ حریم شخصی‌
                </Link>{" "}
                می‌باشد.
              </span>
            }
            aria-checked="true"
          />
        </div>

        <div className={cn("fixed inset-x-0 bottom-0 p-4 pb-8 bg-surface-background border-t border-border-mid grid")}>
          <div className={cn("w-full max-w-[580px] mx-auto")}>
            <Button
              type="primary"
              style="filled"
              size="large"
              className={cn("w-full max-w-[580px] mx-auto")}
              onClick={handleSend}
              loading={loading}
              disabled={loading}
              fullWidth
            >
              ارسال کد یکبار مصرف
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
