"use client";

import { useState } from "react";
import s from "./signin.module.css";
import Button from "@/components/ui/Button/Button";
import Input from "@/components/ui/Input/Input";
import Checkbox from "@/components/ui/Checkbox/Checkbox";
import Link from "next/link";
import { apiStartOtp } from "@/lib/client/auth";
import { normalizeDigits } from "@/lib/utils/normalizeDigits";

type Props = {
  onSubmit: (phone: string) => void;
  initialPhone?: string;
};

export default function SigninInner({ onSubmit, initialPhone = "" }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    <section className={s.page}>
      <form
        className={s.form}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <div className={s.head}>
          <h1 className={s.title}>ورود / عضویت</h1>
          <p className={s.subtitle}>
            شماره موبایل خود را وارد کنید تا کد تایید برایتان ارسال شود.
          </p>
        </div>

        <div className={s.fieldWrap}>
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

        {/* Terms row (checked, non-toggleable) */}
        <div className={s.termsRow}>
          <Checkbox
            checked
            name="accept_terms"
            label={
              <span className={s.termsText}>
                ورود و عضویت در کادوچی به منزله‌ی مطالعه و پذیرش{" "}
                <Link href="/terms" className={s.link}>
                  قوانین و مقررات
                </Link>{" "}
                و{" "}
                <Link href="/privacy" className={s.link}>
                  حفظ حریم شخصی‌
                </Link>{" "}
                می‌باشد.
              </span>
            }
            aria-checked="true"
          />
        </div>

        <div className={s.ctaBar}>
          <div className={s.ctaBtn}>
            <Button
              type="primary"
              style="filled"
              size="large"
              className={s.ctaBtn}
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
