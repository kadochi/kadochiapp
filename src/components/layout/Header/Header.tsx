"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import SideMenu from "@/components/layout/SideMenu/SideMenu";
import { useBasket } from "@/domains/basket/state/basket-context";
import { useSession } from "@/domains/auth/session-context";
import Button from "@/components/ui/Button/Button";
import s from "./Header.module.css";

type HeaderProps = {
  showBack?: boolean;
  backHref?: string;
  backAriaLabel?: string;
};

export default function Header({
  showBack = false,
  backHref,
  backAriaLabel = "بازگشت",
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { basketCount } = useBasket();
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useSession();

  useEffect(() => setMounted(true), []);

  const safeCount = mounted ? basketCount : 0;
  const basketActive = safeCount > 0;

  const basketIconSrc = useMemo(
    () =>
      basketActive ? "/icons/basket-filled.svg" : "/icons/basket-empty.svg",
    [basketActive]
  );

  const handleBack = () => {
    if (backHref) router.push(backHref);
    else router.back();
  };

  const isLoggedIn = !!session;
  const accountLabel = useMemo(() => {
    const name = (session as any)?.name as string | undefined;
    const phone = (session as any)?.phone as string | undefined;
    return (name && name.trim()) || phone || "حساب کاربری";
  }, [session]);

  const handleAccountClick = () => {
    if (isLoggedIn) router.push("/profile");
    else router.push("/login");
  };

  const isOnProductPage = pathname?.startsWith("/product/");
  const shouldShowBack = showBack || isOnProductPage;

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
              onClick={handleAccountClick}
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
