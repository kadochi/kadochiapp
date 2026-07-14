import type { Metadata } from "next";
import { Suspense } from "react";

import { LoginFlow } from "@/features/auth/components/login-flow";

export const metadata: Metadata = {
  title: "کادوچی | ورود به حساب کاربری",
  description: "با شماره موبایل و کد تأیید یک‌بار مصرف وارد حساب کاربری کادوچی شوید.",
};

export default function LoginPage() {
  const isLocalAuth = process.env.NODE_ENV === "development"
    && (process.env.KADOCHI_AUTH_MODE ?? "local") === "local";

  return (
    <Suspense fallback={<div className="min-h-[calc(100dvh-var(--spacing-88))] bg-surface-background" />}>
      <LoginFlow isLocalAuth={isLocalAuth} />
    </Suspense>
  );
}
