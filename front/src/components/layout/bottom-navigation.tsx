"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { cva } from "class-variance-authority";

type NavigationItem = {
  label: string;
  href: string;
  icon: string;
  activeIcon: string;
  matchExact?: boolean;
};

const navigationItems = [
  {
    label: "کادوچی",
    href: "/",
    icon: "/icons/home.svg",
    activeIcon: "/icons/home-active.svg",
    matchExact: true,
  },
  {
    label: "محصولات",
    href: "/products",
    icon: "/icons/products.svg",
    activeIcon: "/icons/products-active.svg",
  },
  {
    label: "مناسبت‌ها",
    href: "/#occasions",
    icon: "/icons/occasions.svg",
    activeIcon: "/icons/occasions-active.svg",
  },
  {
    label: "پروفایل",
    href: "/login?next=/",
    icon: "/icons/profile.svg",
    activeIcon: "/icons/profile-active.svg",
  },
] as const satisfies readonly NavigationItem[];

const bottomNavigationSafeArea =
  "calc(80px + max(env(safe-area-inset-bottom), 8px))";

const navigationItemVariants = cva(
  [
    "flex flex-[1_1_0] flex-col items-center mx-4 border-0 bg-transparent pt-8 pb-32",
    "cursor-pointer select-none font-sans text-label-12 font-regular leading-[var(--text-label-12--line-height)] no-underline outline-none",
    "[-webkit-tap-highlight-color:transparent] [transition-property:color] duration-[180ms] ease-[ease]",
    "focus-visible:rounded-s focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-mid-emphasis",
    "motion-reduce:transition-none",
  ],
  {
    variants: {
      active: {
        true: [
          "text-surface-neutral-high-emphasis",
          "[&_[data-slot=bottom-navigation-label]]:font-bold",
          "[&_[data-slot=bottom-navigation-icon-base]]:opacity-0",
          "[&_[data-slot=bottom-navigation-icon-active]]:opacity-100",
        ],
        false: "text-surface-neutral-mid-emphasis",
      },
    },
    defaultVariants: {
      active: false,
    },
  },
);

function isActiveNavigationItem(item: NavigationItem, pathname: string) {
  return item.matchExact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function BottomNavigation() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.dataset.bottomNav = "active";
    document.body.style.setProperty("--bottom-nav-safe", bottomNavigationSafeArea);

    return () => {
      document.body.style.removeProperty("--bottom-nav-safe");
      delete document.body.dataset.bottomNav;
    };
  }, []);

  return (
    <nav
      aria-label="پیمایش پایین صفحه"
      className="fixed inset-x-0 bottom-0 z-[100] flex h-[calc(var(--bottom-nav-height)+max(env(safe-area-inset-bottom),var(--spacing-8)))] items-start justify-between border-t border-border-low-emphasis bg-surface-background px-8 pb-[max(env(safe-area-inset-bottom),var(--spacing-8))] [--bottom-nav-height:80px] [direction:rtl] lg:hidden"
    >
      {navigationItems.map((item) => {
        const isActive = isActiveNavigationItem(item, pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={navigationItemVariants({ active: isActive })}
            prefetch={false}
          >
            <span
              aria-hidden="true"
              className="relative inline-flex size-24 items-center justify-center"
            >
              <Image
                alt=""
                className="absolute inset-0 size-24 opacity-100 [transition-property:opacity] duration-[160ms] ease-[ease] motion-reduce:transition-none"
                data-slot="bottom-navigation-icon-base"
                height={24}
                src={item.icon}
                width={24}
              />
              <Image
                alt=""
                className="absolute inset-0 size-24 opacity-0 [transition-property:opacity] duration-[160ms] ease-[ease] motion-reduce:transition-none"
                data-slot="bottom-navigation-icon-active"
                height={24}
                src={item.activeIcon}
                width={24}
              />
            </span>
            <span data-slot="bottom-navigation-label" className="mt-2">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export { BottomNavigation, navigationItemVariants };
export type { NavigationItem };
export default BottomNavigation;
