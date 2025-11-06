// src/app/auth/login/page.tsx
import type { Metadata } from "next";
import HeaderInternal from "@/components/layout/Header/HeaderInternal";
import LoginClient from "./LoginClient";

export const metadata: Metadata = {
  title: "کادوچی | ورود به حساب کاربری",
  description:
    "برای ادامه در کادوچی، شماره موبایل خود را وارد کنید تا کد تأیید برای شما ارسال شود.",
};

export default function LoginPage() {
  return (
    <>
      <HeaderInternal title="" />
      <div />
      <LoginClient />
    </>
  );
}
