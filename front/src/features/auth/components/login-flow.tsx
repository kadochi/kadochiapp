"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuth } from "../auth-provider";
import { LOCAL_AUTH_OTP_LENGTH, LOCAL_AUTH_PHONE } from "../local-auth";
import type { OtpStartResponse } from "../types";
import { OtpVerificationForm } from "./otp-verification-form";
import { PhoneLoginForm } from "./phone-login-form";

function safeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") && !value.includes("\\") ? value : "/";
}

export function LoginFlow({ isLocalAuth }: { isLocalAuth: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuth();
  const [phone, setPhone] = useState(isLocalAuth ? LOCAL_AUTH_PHONE : "");
  const [challenge, setChallenge] = useState<OtpStartResponse | null>(null);
  const nextPath = useMemo(() => safeNextPath(searchParams.get("next")), [searchParams]);

  useEffect(() => {
    if (status === "authenticated") router.replace(nextPath);
  }, [nextPath, router, status]);

  if (challenge) {
    return (
      <OtpVerificationForm
        codeLength={challenge.codeLength ?? LOCAL_AUTH_OTP_LENGTH}
        initialRetryAfter={challenge.retryAfter ?? 0}
        onBack={() => setChallenge(null)}
        onVerified={() => router.replace(nextPath)}
        phone={phone}
      />
    );
  }

  return (
    <PhoneLoginForm
      initialPhone={phone}
      onStarted={(nextPhone, nextChallenge) => {
        setPhone(nextPhone);
        setChallenge(nextChallenge);
      }}
    />
  );
}
