"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import SideMenu from "@/components/layout/SideMenu/SideMenu";
import { useBasket } from "@/domains/basket/state/basket-context";
import { useSession } from "@/domains/auth/session-context";
import Button from "@/components/ui/Button/Button";

// استایل‌های هر دو ورژن بدون تغییر
import s from "./Header.module.css";
import si from "./HeaderInternal.module.css";

type HeaderVariant = "default" | "internal";

type HeaderProps = {
  variant?: HeaderVariant;

  // props مخصوص default
  showBack?: boolean;
  backHref?: string;
  backAriaLabel?: string;

  // props مخصوص internal
  title?: string;
  backUrl?: string;
};

export default function Header({
  variant = "default",

  // default props
  showBack = false,
  backHref,
  backAriaLabel = "بازگشت",

  // internal props
  title,
  backUrl,
}: HeaderProps) {
  // هوک‌ها را همیشه یکسان صدا می‌زنیم تا اختلاف تعداد هوک پیش نیاید
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pageTitle, setPageTitle] = useState<string | undefined>(title);

  const router = useRouter();
  const pathname = usePathname();
  const { basketCount } = useBasket();
  const { session } = useSession();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (variant === "internal") {
      if (title === undefined && typeof document !== "undefined") {
        setPageTitle(document.title || undefined);
      } else {
        setPageTitle(title);
      }
    }
  }, [variant, title]);

  // منطقِ ورژن default (عین قبل)
  const safeCount = mounted ? basketCount : 0;
  const basketActive = safeCount > 0;

  const basketIconSrc = useMemo(
    () =>
      basketActive ? "/icons/basket-filled.svg" : "/icons/basket-empty.svg",
    [basketActive]
  );

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      const hasHistory = window.history.length > 1;
      if (hasHistory || (referrer && referrer !== window.location.href)) {
        router.back();
        return;
      }
    }
    router.push("/products");
  };

  const isLoggedIn = !!session;
  const accountLabel = useMemo(() => {
    const name = (session as any)?.name as string | undefined;
    const phone = (session as any)?.phone as string | undefined;
    return (name && name.trim()) || phone || "حساب کاربری";
  }, [session]);

  const isOnProductPage = pathname?.startsWith("/product/");
  const shouldShowBack = showBack || isOnProductPage;

  // رندر بر اساس ورینت—کدها بدون تغییرِ منطقی/استایلی
  if (variant === "internal") {
    return (
      <header className={si.root} dir="rtl" aria-label="سربرگ داخلی">
        <a
          href={backUrl || "#"}
          className={si.back}
          aria-label="بازگشت"
          onClick={(e) => {
            e.preventDefault();
            if (backUrl) router.push(backUrl);
            else if (typeof history !== "undefined") history.back();
          }}
        >
          <Image
            src="/icons/arrow-right.svg"
            alt=""
            width={32}
            height={32}
            className={si.icon}
            aria-hidden
            priority={false}
          />
        </a>

        {pageTitle ? <h1 className={si.title}>{pageTitle}</h1> : null}

        <div className={si.logoWrap}>
          <Link href="/" aria-label="صفحه اصلی" className={si.logoLink}>
            <Image
              src="/images/logo.svg"
              alt="Kadochi"
              width={60}
              height={56}
              className={si.logo}
            />
          </Link>
        </div>
      </header>
    );
  }

  // ورینت default (قبلی)
  return (
    <>
      <div className={s.headerWrap}>
        <header className={s.header}>
          <div className={s.leftGroup}>
            <Link
              href="/basket"
              className={s.iconWithBadge}
              aria-label="سبد خرید"
              data-active={basketActive}
              prefetch={false}
            >
              <img
                src={basketIconSrc}
                alt="Basket"
                width={32}
                height={32}
                className={s.icon}
                loading="lazy"
                decoding="async"
              />
              {basketActive && (
                <div className={s.badge} data-active aria-hidden={false}>
                  {safeCount}
                </div>
              )}
            </Link>

            <Button
              className={s.accountBtn}
              type="secondary"
              style="tonal"
              size="medium"
              onClick={() =>
                isLoggedIn ? router.push("/profile") : router.push("/login")
              }
              aria-label={isLoggedIn ? "حساب کاربری" : "ورود / عضویت"}
              leadingIcon={
                <img
                  src="/icons/user-login.svg"
                  alt=""
                  width={20}
                  height={20}
                  loading="lazy"
                  decoding="async"
                />
              }
            >
              <span className={s.accountText}>{accountLabel}</span>
            </Button>
          </div>

          <Link href="/" className={s.logoLink} prefetch={false}>
            <img
              src="/images/logo.svg"
              alt="Logo"
              width={56}
              height={56}
              className={s.logo}
              loading="eager"
              fetchPriority="low"
              decoding="async"
            />
          </Link>

          {shouldShowBack ? (
            <img
              src="/icons/arrow-right.svg"
              alt={backAriaLabel}
              width={32}
              height={32}
              className={`${s.icon} ${s.hamburger}`}
              onClick={handleBack}
              loading="lazy"
              decoding="async"
            />
          ) : (
            <img
              src="/icons/menu-black.svg"
              alt="Menu"
              width={32}
              height={32}
              className={`${s.icon} ${s.hamburger}`}
              onClick={() => setMenuOpen(true)}
              loading="lazy"
              decoding="async"
            />
          )}

          <nav className={s.navLinks}>
            <Link
              href="/"
              className={`${s.navLink} ${s.bold}`}
              prefetch={false}
            >
              کادوچی
            </Link>
            <Link href="/products" className={s.navLink} prefetch={false}>
              کادو‌ها
            </Link>
            <Link
              href="/products?category=flower"
              className={s.navLink}
              prefetch={false}
            >
              گل
            </Link>
            <Link
              href="/products?category=chocolate"
              className={s.navLink}
              prefetch={false}
            >
              کیک تولد
            </Link>
            <Link href="/occasions" className={s.navLink} prefetch={false}>
              مناسبت‌ها
            </Link>
          </nav>
        </header>
      </div>

      <SideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
