"use client";

import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { LayoutAuth } from "@/components/layout/layout-auth";
import { Button } from "@/components/ui/button";
import { FieldLabel, Input, InputMessage } from "@/components/ui/input";
import { ServiceError } from "@/lib/http/errors";
import { cn } from "@/lib/utils";
import { useAuth } from "../auth-provider";

type OtpVerificationFormProps = {
  codeLength: number;
  phone: string;
  initialRetryAfter: number;
  onBack: () => void;
  onVerified: () => void;
};

function latinDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function verifyErrorMessage(error: unknown): string {
  if (error instanceof ServiceError) {
    if (error.detail.code === "unauthenticated")
      return "کد واردشده نادرست است یا اعتبار آن تمام شده است.";
    if (error.detail.code === "rate_limited")
      return "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.";
    if (error.detail.retryable)
      return "ارتباط با سرویس ورود برقرار نشد. دوباره تلاش کنید.";
  }
  return "تأیید کد با مشکل مواجه شد. دوباره تلاش کنید.";
}

export function OtpVerificationForm({
  codeLength,
  phone,
  initialRetryAfter,
  onBack,
  onVerified,
}: OtpVerificationFormProps) {
  const { startOtp, verifyOtp } = useAuth();
  const [otpLength, setOtpLength] = useState(codeLength);
  const [code, setCode] = useState(() =>
    Array.from({ length: codeLength }, () => ""),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(initialRetryAfter));
  const [resendCount, setResendCount] = useState(0);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(
      () => setSecondsLeft((current) => Math.max(0, current - 1)),
      1_000,
    );
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  function writeCode(value: string) {
    const digits = latinDigits(value)
      .replace(/\D/g, "")
      .slice(0, otpLength);
    const next = Array.from(
      { length: otpLength },
      (_, index) => digits[index] ?? "",
    );
    setCode(next);
    setError(null);
    inputRefs.current[
      Math.min(digits.length, otpLength) - 1
    ]?.focus();
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    writeCode(event.clipboardData.getData("text"));
  }

  function handleKeyDown(
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key === "Backspace" && !code[index] && index > 0)
      inputRefs.current[index - 1]?.focus();
    if (event.key === "ArrowLeft" && index < otpLength - 1)
      inputRefs.current[index + 1]?.focus();
    if (event.key === "ArrowRight" && index > 0)
      inputRefs.current[index - 1]?.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const joined = code.join("");
    if (joined.length !== otpLength) {
      setError(`کد تأیید ${otpLength} رقمی را کامل وارد کنید.`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await verifyOtp({ phone, code: joined });
      onVerified();
    } catch (caught) {
      setError(verifyErrorMessage(caught));
      setCode(Array.from({ length: otpLength }, () => ""));
      window.setTimeout(() => inputRefs.current[0]?.focus(), 0);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (secondsLeft > 0 || resendCount >= 3 || resending) return;
    try {
      setResending(true);
      setError(null);
      const challenge = await startOtp({ phone });
      const nextLength = challenge.codeLength ?? otpLength;
      if (nextLength !== otpLength) {
        setOtpLength(nextLength);
        setCode(Array.from({ length: nextLength }, () => ""));
      }
      setSecondsLeft(Math.ceil(challenge.retryAfter ?? 60));
      setResendCount((current) => current + 1);
    } catch (caught) {
      setError(verifyErrorMessage(caught));
    } finally {
      setResending(false);
    }
  }

  return (
    <LayoutAuth
      title="کد تأیید را وارد کنید"
      description={
        <>
          کد ارسال‌شده به شماره{" "}
          <bdi
            className="font-bold text-surface-neutral-high-emphasis"
            dir="ltr"
          >
            {phone}
          </bdi>{" "}
          را وارد کنید.
        </>
      }
      headerAction={
        <Button
          className="mt-8 h-auto min-h-0 max-h-none w-fit px-0 font-bold text-information"
          onClick={onBack}
          size="small"
          type="button"
          variant="link-ghost"
        >
          <Image
            alt=""
            aria-hidden
            height={24}
            src="/icons/edit.svg"
            width={24}
          />
          ویرایش شماره موبایل
        </Button>
      }
    >
      <form className="flex min-w-0 w-full flex-col items-center gap-32" onSubmit={handleSubmit}>
        <fieldset className="m-0 grid min-w-0 w-full justify-items-start gap-8 border-0 p-0 px-24">
          <legend className="contents">
            <FieldLabel htmlFor="otp-code-0">کد تأیید</FieldLabel>
          </legend>
          <div className="flex w-full gap-12" dir="ltr" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <div className="flex-1" key={index}>
                <Input
                  aria-label={`رقم ${index + 1} کد تأیید`}
                  aria-describedby={error ? "otp-code-description" : undefined}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  dir="ltr"
                  id={`otp-code-${index}`}
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(event) => {
                    const value = latinDigits(event.currentTarget.value)
                      .replace(/\D/g, "")
                      .slice(-1);
                    setCode((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? value : item,
                      ),
                    );
                    setError(null);
                    if (value && index < otpLength - 1)
                      inputRefs.current[index + 1]?.focus();
                  }}
                  onKeyDown={(event) => handleKeyDown(index, event)}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  status={error ? "error" : "default"}
                  value={digit}
                />
              </div>
            ))}
          </div>
          {error ? (
            <InputMessage id="otp-code-description" size="md" status="error">
              {error}
            </InputMessage>
          ) : null}
        </fieldset>

        <div className="grid min-h-24 w-full justify-items-start gap-8 px-24 text-body-16 text-surface-neutral-mid-emphasis">
          {secondsLeft > 0 ? (
            <p className="m-0">امکان ارسال مجدد تا {secondsLeft} ثانیه دیگر</p>
          ) : resendCount < 3 ? (
            <Button
              className="mt-8 h-auto min-h-0 max-h-none px-0 font-bold"
              disabled={resending}
              onClick={handleResend}
              size="small"
              type="button"
              variant="link-ghost"
            >
              <Image
                alt=""
                aria-hidden
                className={cn(resending && "animate-spin")}
                height={24}
                src="/icons/refresh.svg"
                width={24}
              />
              ارسال مجدد کد
            </Button>
          ) : (
            <p className="m-0 text-error">
              حداکثر سه بار امکان ارسال مجدد کد وجود دارد.
            </p>
          )}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col items-center border-t border-border-mid-emphasis bg-surface-background p-16 pb-[max(var(--spacing-24),env(safe-area-inset-bottom))]">
          <Button
            className="mx-auto w-full max-w-[580px]"
            disabled={code.some((digit) => !digit)}
            loading={loading}
            size="large"
            type="submit"
          >
            ورود
          </Button>
        </div>
      </form>
    </LayoutAuth>
  );
}
