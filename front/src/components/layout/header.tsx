"use client";

/* eslint-disable @next/next/no-img-element -- These are local, fixed-size icon assets. */

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cva } from "class-variance-authority";
import { useOptionalAuth } from "@/features/auth/auth-provider";
import { cartChangedEvent, getCart } from "@/features/cart/services/cart";
import { useUnreadNotifications } from "@/features/profile/hooks/use-unread-notifications";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const SideMenu = dynamic(
  () => import("./side-menu").then((module) => module.SideMenu),
  { ssr: false },
);

type HeaderVariant = "default" | "internal";

type HeaderUser = {
  displayName?: string | null;
  name?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarSrc?: string | null;
};

export type HeaderProps = {
  variant?: HeaderVariant;
  /** Shows the back action in the default header. Product pages show it automatically. */
  showBack?: boolean;
  /** Destination for the default header's back action. */
  backHref?: string;
  backAriaLabel?: string;
  /** Title used by the internal header; the document title is used when omitted. */
  title?: string;
  /** Destination for the internal header's back action. */
  backUrl?: string;
  /** Optional controlled cart count. When omitted, it is read from the cart BFF. */
  basketCount?: number;
  /** Optional controlled auth state. When omitted, it is read from the auth BFF. */
  isAuthenticated?: boolean;
  /** Optional user data for a controlled auth state. */
  user?: HeaderUser | null;
  className?: string;
};

const iconButtonVariants = cva(
  "flex size-32 shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0",
  {
    variants: {
      desktopOnly: {
        true: "min-[864px]:hidden",
        false: null,
      },
    },
    defaultVariants: {
      desktopOnly: false,
    },
  },
);

type NavigationItem = {
  href: string;
  label: string;
  emphasized?: boolean;
  icon?: string;
  animated?: boolean;
};

const navigationItems: readonly NavigationItem[] = [
  { href: "/", label: "کادوچی", emphasized: true },
  { href: "/products", label: "کادو‌ها" },
  { href: "/products?category=flower", label: "گل" },
  { href: "/products?category=chocolate", label: "کیک تولد" },
  { href: "/occasions", label: "مناسبت‌ها" },
  { href: "/magazine", label: "مجله" },
  { href: "/products?delivery=today", label: "ارسال روز", icon: "/icons/today-delivery.svg", animated: true },
];

function getAccountLabel(user: HeaderUser | null) {
  const fullName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    user?.displayName?.trim() ||
    user?.name?.trim() ||
    fullName ||
    user?.phone ||
    "حساب کاربری"
  );
}

function InternalHeader({
  title,
  backUrl,
  className,
}: Pick<HeaderProps, "title" | "backUrl" | "className">) {
  const router = useRouter();
  const [pageTitle, setPageTitle] = useState<string | undefined>(title);

  useEffect(() => {
    // The document title is an external value and is intentionally read after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageTitle(title === undefined ? document.title || undefined : title);
  }, [title]);

  return (
    <header
      aria-label="سربرگ داخلی"
      className={cn(
        "sticky top-0 z-[1000] mx-auto flex h-88 w-full max-w-[1440px] items-center justify-center box-border bg-surface-background px-16 [direction:rtl]",
        className,
      )}
      dir="rtl"
    >
      <a
        aria-label="بازگشت"
        className="absolute top-1/2 right-16 flex size-32 -translate-y-1/2 cursor-pointer items-center justify-center border-0 bg-transparent p-0"
        href={backUrl ?? "#"}
        onClick={(event) => {
          event.preventDefault();
          if (backUrl) {
            router.push(backUrl);
          } else {
            window.history.back();
          }
        }}
      >
        <Image alt="" aria-hidden className="size-32" height={32} src="/icons/arrow-right.svg" width={32} />
      </a>

      {pageTitle ? (
        <h1 className="absolute top-1/2 right-[calc(var(--spacing-16)+var(--spacing-32)+var(--spacing-8))] m-0 -translate-y-1/2 font-sans text-title-16 font-bold leading-[var(--text-title-16--line-height)] text-surface-neutral-high-emphasis">
          {pageTitle}
        </h1>
      ) : null}

      <div className="hidden flex-1 items-center justify-center min-[864px]:flex">
        <Link aria-label="صفحه اصلی" className="inline-flex items-center justify-center leading-none" href="/" prefetch={false}>
          <Image alt="Kadochi" className="block h-56 w-[60px]" height={56} src="/images/logo.svg" width={60} />
        </Link>
      </div>
    </header>
  );
}

function DefaultHeader({
  showBack = false,
  backHref,
  backAriaLabel = "بازگشت",
  basketCount: controlledBasketCount,
  isAuthenticated: controlledAuthentication,
  user: controlledUser,
  className,
}: Omit<HeaderProps, "variant" | "title" | "backUrl">) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useOptionalAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasOpenedMenu, setHasOpenedMenu] = useState(false);
  const [basketCount, setBasketCount] = useState(0);

  const refreshBasketCount = useCallback(() => {
    let cancelled = false;
    void getCart()
      .then((cart) => {
        if (!cancelled) {
          setBasketCount(cart.items.reduce((total, item) => total + item.quantity, 0));
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (controlledBasketCount !== undefined) return;
    let cancelInitialRequest: (() => void) | undefined;
    // The cart indicator is part of the persistent navigation, so waiting for
    // an idle period (previously after 15 seconds) made it look empty on each
    // newly mounted header. Start loading it immediately after hydration.
    const timerId = window.setTimeout(() => {
      cancelInitialRequest = refreshBasketCount();
    }, 0);

    const handleCartChange = () => refreshBasketCount();
    window.addEventListener(cartChangedEvent, handleCartChange);
    return () => {
      window.clearTimeout(timerId);
      cancelInitialRequest?.();
      window.removeEventListener(cartChangedEvent, handleCartChange);
    };
  }, [controlledBasketCount, refreshBasketCount]);

  const visibleBasketCount = Math.max(0, controlledBasketCount ?? basketCount);
  const hasItems = visibleBasketCount > 0;
  const providerUser: HeaderUser | null = auth?.customer ? {
    displayName: auth.customer.displayName,
    firstName: auth.customer.firstName,
    lastName: auth.customer.lastName,
    phone: auth.customer.phone,
    avatarSrc: auth.customer.avatarSrc,
  } : null;
  const accountUser = controlledUser !== undefined ? controlledUser : providerUser;
  const isAuthenticated = controlledAuthentication ?? (auth ? auth.status === "authenticated" : Boolean(accountUser));
  const unreadNotificationCount = useUnreadNotifications(isAuthenticated);
  const accountLabel = getAccountLabel(accountUser);
  const shouldShowBack = showBack || pathname.startsWith("/product/");

  const handleBack = () => {
    if (pathname.startsWith("/product/")) {
      router.push("/products");
      return;
    }

    if (backHref) {
      router.push(backHref);
      return;
    }

    const hasReferrer = document.referrer && document.referrer !== window.location.href;
    if (window.history.length > 1 || hasReferrer) {
      router.back();
      return;
    }

    router.push("/products");
  };

  return (
    <>
      <div className={cn("sticky top-0 inset-x-0 z-50 bg-surface-background", className)}>
        <header className="relative mx-auto flex h-88 w-full max-w-[1440px] items-center justify-between box-border bg-surface-background px-16 [direction:ltr]">
          <div className="flex items-center gap-12">
            <Link
              aria-label="سبد خرید"
              className="flex cursor-pointer items-center gap-4 no-underline"
              data-active={hasItems || undefined}
              href="/basket"
              prefetch={false}
            >
              <img
                alt="Basket"
                className="size-32"
                decoding="async"
                height={32}
                loading="lazy"
                src={hasItems ? "/icons/basket-filled.svg" : "/icons/basket-empty.svg"}
                width={32}
              />
              {hasItems ? (
                <span
                  aria-hidden={false}
                  className="box-border h-24 min-w-24 rounded-rounded bg-error px-6 text-center font-sans text-label-14 font-regular leading-[24px] text-on-error"
                  data-active
                >
                  {visibleBasketCount}
                </span>
              ) : null}
            </Link>

            <Button
              aria-label={isAuthenticated ? "حساب کاربری" : "ورود / عضویت"}
              className="hidden gap-6 px-12 py-8 pl-16 min-[864px]:inline-flex"
              onClick={() => router.push(isAuthenticated ? "/profile" : "/login")}
              size="medium"
              variant="secondary-tonal"
            >
              <span className="relative inline-flex">
                <img alt="" className="!size-20" decoding="async" height={20} loading="lazy" src="/icons/user-login.svg" width={20} />
                {unreadNotificationCount > 0 ? <span aria-label="اعلان خوانده‌نشده" className="absolute -top-3 -right-3 size-8 rounded-full bg-error ring-2 ring-surface-background" /> : null}
              </span>
              <span className="font-sans text-label-16 font-regular leading-[var(--text-label-16--line-height)]">
                {accountLabel}
              </span>
            </Button>
          </div>

          <Link className="flex items-center justify-center" href="/" prefetch={false}>
            <img alt="Logo" className="absolute left-1/2 h-56 w-[60px] -translate-x-1/2" decoding="async" fetchPriority="high" height={56} loading="eager" src="/images/logo.svg" width={60} />
          </Link>

          {shouldShowBack ? (
            <button
              aria-label={backAriaLabel}
              className={iconButtonVariants({ desktopOnly: true })}
              onClick={handleBack}
              type="button"
            >
              <img alt="" aria-hidden className="size-32" decoding="async" height={32} loading="lazy" src="/icons/arrow-right.svg" width={32} />
            </button>
          ) : (
            <button
              aria-label="Menu"
              className={iconButtonVariants({ desktopOnly: true })}
              onClick={() => {
                setHasOpenedMenu(true);
                setIsMenuOpen(true);
              }}
              type="button"
            >
              <img alt="Menu" className="size-32" decoding="async" height={32} loading="lazy" src="/icons/menu-black.svg" width={32} />
            </button>
          )}

          <nav aria-label="پیمایش اصلی" className="hidden gap-24 min-[864px]:flex [direction:rtl]">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                className={cn(
                  "inline-flex items-center gap-4 font-sans text-label-16 font-regular text-surface-neutral-high-emphasis no-underline",
                  item.emphasized && "font-bold",
                  item.animated && "bg-[linear-gradient(90deg,var(--color-on-primary-container),var(--color-primary),var(--color-on-primary-container))] bg-[length:200%_100%] bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [animation:hero-text-shimmer_4s_ease-in-out_infinite] motion-reduce:animate-none",
                )}
                href={item.href}
                prefetch={false}
              >
                {item.icon ? <Image alt="" aria-hidden className="size-16" height={16} src={item.icon} width={16} /> : null}
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
      </div>

      {hasOpenedMenu ? (
        <SideMenu
          isLoggedIn={isAuthenticated}
          isOpen={isMenuOpen}
          unreadNotificationCount={unreadNotificationCount}
          onClose={() => setIsMenuOpen(false)}
          user={accountUser ? {
            avatarSrc: accountUser.avatarSrc,
            firstName: accountUser.firstName,
            lastName: accountUser.lastName,
            name: getAccountLabel(accountUser),
            phone: accountUser.phone,
          } : undefined}
        />
      ) : null}
    </>
  );
}

/**
 * The site header in its storefront and internal-page configurations.
 *
 * It keeps the original routes, responsive layout, cart indicator, account
 * action, and side menu while using the application's current BFF services.
 */
function Header({ variant = "default", ...props }: Readonly<HeaderProps>) {
  return variant === "internal" ? <InternalHeader {...props} /> : <DefaultHeader {...props} />;
}

// Kept for callers that previously rendered the internal header directly.
const HeaderInternal = InternalHeader;

export { Header, HeaderInternal, iconButtonVariants };
export type { HeaderUser, HeaderVariant };
export default Header;
