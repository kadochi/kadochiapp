import type { Metadata } from "next";
import ProfilePageClient from "./ProfilePageClient";
import getInitialSession, { type Session } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "حساب کاربری",
  description:
    "مدیریت حساب کاربری، مشاهده سفارش‌ها و اطلاعات پروفایل شما در کادوچی.",
};

export default async function Page() {
  const session: Session | null = await getInitialSession();
  const isLoggedIn = !!session?.userId;

  const initialDisplayName =
    session?.name?.trim() ||
    [session?.firstName?.trim(), session?.lastName?.trim()]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    session?.phone?.trim() ||
    "کاربر";

  return (
    <ProfilePageClient
      isLoggedInInitial={isLoggedIn}
      initialDisplayName={initialDisplayName}
      signinHref="/login"
    />
  );
}
