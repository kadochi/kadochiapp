"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import Header from "@/components/layout/Header/Header";
import Divider from "@/components/ui/Divider/Divider";
import Button from "@/components/ui/Button/Button";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import StateMessage from "@/components/layout/StateMessage/StateMessage";
import Avatar from "@/components/ui/Avatar/Avatar";
import { useSession } from "@/domains/auth/session-context";

import s from "./profile.module.css";

type Props = {
  /** Initial values from SSR while context is not yet hydrated */
  initialDisplayName?: string;
  isLoggedInInitial?: boolean;
  /** Sign-in path (kept backward-compatible) */
  signinHref?: string;
};

/** Phone detector (Latin/Persian digits, +98, spaces, hyphens) */
function isLikelyPhone(v?: string | null): boolean {
  if (!v) return false;
  const str = v.trim();
  const map: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };
  const normalized = str
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[()\s-]/g, "");
  return /^\+?\d{7,15}$/.test(normalized);
}

export default function ProfilePageClient({
  initialDisplayName = "کاربر",
  isLoggedInInitial = false,
  signinHref = "/login",
}: Props) {
  const { session, refreshSession } = useSession();
  const router = useRouter();

  /** Ensure we refresh once on mount if names are missing */
  useEffect(() => {
    if (session?.userId && !session.firstName && !session.lastName) {
      refreshSession().catch(() => {});
    }
  }, [session?.userId, session?.firstName, session?.lastName, refreshSession]);

  /** Auth state: client session wins; SSR flag is fallback */
  const isLoggedIn = useMemo(
    () => !!session?.userId || isLoggedInInitial,
    [session?.userId, isLoggedInInitial]
  );

  /** Title priority: (firstName + lastName) > phone > fallback */
  const computedTitle = useMemo(() => {
    const first = (session?.firstName ?? "").trim();
    const last = (session?.lastName ?? "").trim();
    const full = [first, last].filter(Boolean).join(" ").trim();
    const phone = (session?.phone ?? "").trim();
    return full || phone || initialDisplayName || "کاربر";
  }, [
    session?.firstName,
    session?.lastName,
    session?.phone,
    initialDisplayName,
  ]);

  /** Avatar: only pass `name` when it's a real name (not phone-like) */
  const { avatarName, avatarSrc } = useMemo(() => {
    const first = (session?.firstName ?? "").trim();
    const last = (session?.lastName ?? "").trim();
    const full = [first, last].filter(Boolean).join(" ").trim();
    const safeName = full && !isLikelyPhone(full) ? full : undefined;

    const any = session as any;
    const src: string | undefined =
      any?.avatarUrl ||
      any?.avatarURL ||
      any?.avatar?.url ||
      any?.image?.src ||
      undefined;

    return { avatarName: safeName, avatarSrc: src };
  }, [session]);

  const [displayName, setDisplayName] = useState<string>(computedTitle);
  useEffect(() => setDisplayName(computedTitle), [computedTitle]);

  const onLogoutClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    (document.getElementById("logoutForm") as HTMLFormElement | null)?.submit();
  };

  return (
    <div className={s.container}>
      <Header />
      {!isLoggedIn ? (
        <>
          <StateMessage
            imageSrc="/images/login-illustration.png"
            title="وارد حساب کاربری شوید"
            subtitle="برای دسترسی به امکانات و ثبت سفارش، وارد حساب کاربری خود شوید."
            actions={
              <Button
                type="tertiary"
                style="outline"
                size="large"
                className={s.loginCta}
                onClick={() => router.push(signinHref)}
                aria-label="ورود به حساب کاربری"
              >
                ورود به حساب کاربری
              </Button>
            }
            className={s.loggedOut}
          />

          <Divider />

          {/* Single-item menu using SectionHeader (no extra page header) */}
          <div className={s.menu}>
            <Link href="/support" className={s.item}>
              <SectionHeader
                className={s.sectionHeader}
                as="h3"
                title="پشتیبانی کادوچی"
                subtitle="پیگیری سفارش‌ها و تراکنش‌های مالی"
                leftSlot={
                  <img
                    src="/icons/chevron-left.svg"
                    alt=""
                    width={32}
                    height={32}
                    aria-hidden
                  />
                }
              />
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* User row */}
          <div className={s.userRow}>
            <div className={s.avatar}>
              <Avatar
                size="large"
                {...(avatarSrc ? { src: avatarSrc } : {})}
                {...(avatarName ? { name: avatarName } : {})}
              />
            </div>
            <div className={s.userInfo}>
              <div className={s.title}>{displayName}</div>
              <div className={s.subtitle}>حساب کاربری</div>
            </div>
          </div>

          <Divider />

          {/* Menu items via SectionHeader inside Link */}
          <div className={s.menu}>
            <Link href="/profile/info" className={s.item}>
              <SectionHeader
                as="h3"
                title="اطلاعات حساب کاربری"
                subtitle="مشخصات و اطلاعات شخصی"
                className={s.sectionHeader}
                leftSlot={
                  <img
                    src="/icons/chevron-left.svg"
                    alt=""
                    width={32}
                    height={32}
                    aria-hidden
                  />
                }
              />
            </Link>

            <Link href="/profile/orders" className={s.item}>
              <SectionHeader
                as="h3"
                title="سفارش‌های من"
                subtitle="سفارش‌های در انتظار و تکمیل شده"
                className={s.sectionHeader}
                leftSlot={
                  <img
                    src="/icons/chevron-left.svg"
                    alt=""
                    width={32}
                    height={32}
                    aria-hidden
                  />
                }
              />
            </Link>

            <Link
              href="/api/auth/logout"
              className={`${s.item} ${s.danger}`}
              onClick={onLogoutClick}
            >
              <SectionHeader
                as="h3"
                title="خروج از حساب"
                subtitle="خارج شدن از حساب کاربری کادوچی"
                className={s.sectionHeader}
                leftSlot={
                  <img
                    src="/icons/chevron-left.svg"
                    alt=""
                    width={32}
                    height={32}
                    aria-hidden
                  />
                }
              />
            </Link>

            <form
              id="logoutForm"
              action="/api/auth/logout"
              method="POST"
              hidden
            />
          </div>
        </>
      )}
    </div>
  );
}
