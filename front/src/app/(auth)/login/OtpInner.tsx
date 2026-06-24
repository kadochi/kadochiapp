"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import Button from "@/components/ui/Button/Button";
import { apiVerifyOtp, apiStartOtp } from "@/modules/auth/services/otp";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { normalizeDigits } from "@/lib/utils/normalizeDigits";
import { useSession } from "@/modules/auth/context/session-context";

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
  const verifyInFlightRef = useRef(false);

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
    if (joined.length === 4 && !verifyInFlightRef.current) {
      const t = setTimeout(() => {
        handleVerify();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [code]);

  async function handleVerify() {
    const joined = code.join("");
    if (joined.length < 4) {
      setErr("کد تایید ۴ رقمی را وارد کنید.");
      return;
    }
    if (verifyInFlightRef.current) return;

    verifyInFlightRef.current = true;
    try {
      setLoading(true);
      await apiVerifyOtp(phone, joined);

      const sess = await refreshSession();

      try {
        localStorage.setItem("kadochi:session:broadcast", String(Date.now()));
      } catch {}

      if (sess?.userId) {
        window.location.assign(nextUrl);
      } else {
        window.location.replace(nextUrl);
      }
    } catch {
      verifyInFlightRef.current = false;
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
    <section className={cn("bg-surface-background max-w-[580px] mx-auto")}>
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
        className={cn("grid gap-8 pt-20")}
        autoComplete="one-time-code"
        onSubmit={(e) => {
          e.preventDefault();
          handleVerify();
        }}
      >
        <div className={cn("mt-20 px-6 grid gap-2")}>
          <h1 className={cn("mb-3 font-sans text-title-18 leading-title-18 font-bold text-text-primary")}>کد تایید را وارد کنید</h1>
          <p className={cn("m-0 font-sans text-body-16 leading-body-16 text-text-secondary")}>
            کد تایید یکبار مصرف ارسال شده به شماره <span>{phone}</span> را وارد
            کنید.
          </p>
          <div className={cn("font-sans text-sm leading-4 font-bold text-information mt-2 cursor-pointer inline-flex items-center gap-2")} onClick={onBack}>
            <Image
              src="/icons/edit.svg"
              alt=""
              aria-hidden="true"
              width={24}
              height={24}
              className={cn("size-6")}
            />
            <span>ویرایش شماره موبایل</span>
          </div>
        </div>

        <div className={cn("px-6 grid justify-items-start gap-2 mx-auto")}>
          <label className={cn("block mb-2 font-sans text-xs leading-[0.875rem] font-normal text-text-secondary text-right w-full")}>کد تایید</label>
          <div className={cn("flex justify-start gap-3 self-start max-w-[clamp(320px,100%,360px)]")} dir="ltr">
            {code.map((v, i) => (
              <input
                key={i}
                ref={inputs[i]}
                className={cn(
                  "w-full h-14 border border-solid border-border-low rounded-l text-center font-sans text-title-16 leading-title-16 font-bold text-text-primary bg-surface-background outline-none focus:border-primary focus:outline-none focus:ring-2 focus:ring-[var(--primary-primary-gradient)]",
                  err && "border-error"
                )}
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
          {err && (
            <>
              <div className={cn("mt-[6px] text-error font-sans text-xs leading-[0.875rem] text-right w-full")}>{err}</div>
              <Link href="/contact" className={cn("font-sans text-sm leading-4 text-information text-right w-full mt-1 underline cursor-pointer")}>
                پشتیبانی کادوچی
              </Link>
            </>
          )}
        </div>

        <div className={cn("px-6 grid justify-items-start gap-2 mx-auto")}>
          {secondsLeft > 0 ? (
            <p className={cn("m-0 font-sans text-body-16 leading-body-16 text-text-secondary")}>
              امکان ارسال مجدد تا {secondsLeft} ثانیه دیگر
            </p>
          ) : resendCount < 3 ? (
            <div className={cn("font-sans text-sm leading-4 font-bold text-surface-neutral-high mt-2 cursor-pointer inline-flex items-center gap-2")} onClick={handleResend}>
              <Image
                src="/icons/refresh.svg"
                alt="resend"
                aria-hidden="true"
                width={24}
                height={24}
                className={cn("size-6")}
              />
              <span>ارسال مجدد کد</span>
            </div>
          ) : (
            <p className={cn("text-error font-sans text-xs leading-[0.875rem]")}>
              حداکثر ۳ بار در ساعت می‌توانید کد دریافت کنید.
            </p>
          )}
        </div>

        <div className={cn("fixed inset-x-0 bottom-0 p-4 pb-8 bg-surface-background border-t border-border-mid grid")}>
          <div className={cn("w-full max-w-[580px] mx-auto")}>
            <Button
              type="primary"
              style="filled"
              size="large"
              className={cn("w-full")}
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
