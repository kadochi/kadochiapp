// src/app/auth/login/OtpInner.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import s from "./otp.module.css";
import Button from "@/components/ui/Button/Button";
import { apiVerifyOtp, apiStartOtp } from "@/lib/client/auth";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { normalizeDigits } from "@/lib/utils/normalizeDigits";
import { useSession } from "@/domains/auth/session-context";

export default function OtpInner({
  phone,
  onBack,
}: {
  phone: string;
  onBack?: () => void;
}) {
  const [code, setCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resendCount, setResendCount] = useState(0);

  const inputs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const hiddenFullInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/profile";

  const { refreshSession } = useSession();

  useEffect(() => {
    const el = inputs[0].current;
    const t = setTimeout(() => {
      el?.focus();
      el?.select();
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secondsLeft]);

  function syncHiddenValue(parts: string[]) {
    if (hiddenFullInputRef.current)
      hiddenFullInputRef.current.value = parts.join("");
  }

  function writeCodeFromString(full: string) {
    const digits = normalizeDigits(full).replace(/\D/g, "").slice(0, 4);
    const next = [
      digits[0] || "",
      digits[1] || "",
      digits[2] || "",
      digits[3] || "",
    ];
    setCode(next);
    syncHiddenValue(next);
  }

  function handleChange(i: number, v: string) {
    setErr(null);
    const val = normalizeDigits(v).replace(/\D/g, "").slice(0, 1);
    setCode((prev) => {
      const a = [...prev];
      a[i] = val;
      return a;
    });
    if (val && i < inputs.length - 1) inputs[i + 1].current?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !code[i] && i > 0)
      inputs[i - 1].current?.focus();
  }

  useEffect(() => {
    const joined = code.join("");
    if (joined.length === 4 && !loading) {
      const t = setTimeout(() => {
        handleVerify();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [code, loading]);

  async function handleVerify() {
    const joined = code.join("");
    if (joined.length < 4) {
      setErr("کد تایید ۴ رقمی را وارد کنید.");
      return;
    }

    try {
      setLoading(true);
      await apiVerifyOtp(phone, joined);
      await refreshSession();

      try {
        localStorage.setItem("kadochi:session:broadcast", String(Date.now()));
      } catch {}

      router.replace(nextUrl);
    } catch {
      setErr("کد نادرست است یا منقضی شده است.");
      const empty = ["", "", "", ""];
      setCode(empty);
      syncHiddenValue(empty);
      const el = inputs[0].current;
      setTimeout(() => {
        el?.focus();
        el?.select();
      }, 0);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCount >= 3) return;
    try {
      setErr(null);
      await apiStartOtp(phone);
      setResendCount((c) => c + 1);
      setSecondsLeft(60);
    } catch (e: any) {
      if (typeof e.message === "string" && e.message.startsWith("RATE_LIMIT")) {
        setErr("تعداد دفعات ارسال بیش از حد مجاز است. لطفاً بعداً تلاش کنید.");
      } else {
        setErr("ارسال کد با مشکل مواجه شد. لطفاً دوباره تلاش کنید.");
      }
    }
  }

  // WebOTP
  useEffect(() => {
    let aborter: AbortController | null = null;

    async function tryWebOtp() {
      if (!("OTPCredential" in window) || !("credentials" in navigator)) return;

      try {
        aborter = new AbortController();
        const cred = await (navigator as any).credentials.get({
          otp: { transport: ["sms"] },
          signal: aborter.signal,
        });
        if (cred && typeof cred.code === "string") {
          writeCodeFromString(cred.code);
        }
      } catch {}
    }

    tryWebOtp();

    const t = setTimeout(() => {
      try {
        aborter?.abort();
      } catch {}
    }, 60_000);

    return () => {
      clearTimeout(t);
      try {
        aborter?.abort();
      } catch {}
    };
  }, []);

  return (
    <section className={s.page}>
      <input
        ref={hiddenFullInputRef}
        autoComplete="one-time-code"
        inputMode="numeric"
        name="one-time-code"
        pattern="[0-9]*"
        maxLength={4}
        style={{
          position: "absolute",
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
        onChange={(e) => writeCodeFromString(e.target.value)}
        aria-hidden="true"
        tabIndex={-1}
      />

      <form
        className={s.form}
        autoComplete="one-time-code"
        onSubmit={(e) => {
          e.preventDefault();
          handleVerify();
        }}
      >
        <div className={s.head}>
          <h1 className={s.title}>کد تایید را وارد کنید</h1>
          <p className={s.subtitle}>
            کد تایید یکبار مصرف ارسال شده به شماره <span>{phone}</span> را وارد
            کنید.
          </p>
          <div className={s.editlink} onClick={onBack}>
            <Image
              src="/icons/edit.svg"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className={s.editIcon}
            />
            <span>ویرایش شماره موبایل</span>
          </div>
        </div>

        <div className={s.fieldWrap}>
          <label className={s.label}>کد تایید</label>
          <div className={s.otpGroup} dir="ltr">
            {code.map((v, i) => (
              <input
                key={i}
                ref={inputs[i]}
                className={`${s.otpInput} ${err ? s.inputError : ""}`}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={v}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                autoComplete={i === 0 ? "one-time-code" : undefined}
                name={i === 0 ? "one-time-code" : undefined}
                enterKeyHint="done"
                autoFocus={i === 0}
              />
            ))}
          </div>
          {err && <div className={s.errorMsg}>{err}</div>}
        </div>

        <div className={s.fieldWrap}>
          {secondsLeft > 0 ? (
            <p className={s.subtitle}>
              امکان ارسال مجدد تا {secondsLeft} ثانیه دیگر
            </p>
          ) : resendCount < 3 ? (
            <div className={s.resendlink} onClick={handleResend}>
              <Image
                src="/icons/refresh.svg"
                alt="resend"
                aria-hidden="true"
                width={24}
                height={24}
                className={s.resendIcon}
              />
              <span>ارسال مجدد کد</span>
            </div>
          ) : (
            <p className={s.errorMsg}>
              حداکثر ۳ بار در ساعت می‌توانید کد دریافت کنید.
            </p>
          )}
        </div>

        <div className={s.ctaBar}>
          <div className={s.ctaBtn}>
            <Button
              type="primary"
              style="filled"
              size="large"
              className={s.cta}
              onClick={handleVerify}
              loading={loading}
              disabled={loading}
              fullWidth
            >
              ورود
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
