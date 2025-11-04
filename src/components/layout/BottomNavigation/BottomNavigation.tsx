"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import s from "./BottomNavigation.module.css";

type MenuItem = {
  label: string;
  href: string;
  icon: string;
  activeIcon: string;
  matchExact?: boolean;
};

const menuItems: MenuItem[] = [
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
    href: "/occasions",
    icon: "/icons/occasions.svg",
    activeIcon: "/icons/occasions-active.svg",
  },
  {
    label: "پروفایل",
    href: "/profile",
    icon: "/icons/profile.svg",
    activeIcon: "/icons/profile-active.svg",
  },
];

export default function BottomNavigation() {
  const pathname = usePathname();

  if (
    pathname.includes("/product/") ||
    pathname.includes("/basket") ||
    pathname.includes("/auth/") ||
    pathname.includes("/login") ||
    pathname.includes("/checkout") ||
    pathname.includes("/profile/")
  ) {
    return null;
  }

  return (
    <nav className={s.root} aria-label="پیمایش پایین صفحه">
      {menuItems.map((item) => {
        const isActive = item.matchExact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${s.item} ${isActive ? s.active : ""}`}
            aria-current={isActive ? "page" : undefined}
            prefetch={false}
          >
            <span className={s.iconWrap} aria-hidden>
              <Image
                src={item.icon}
                alt=""
                width={24}
                height={24}
                className={s.iconBase}
                priority={false}
              />
              <Image
                src={item.activeIcon}
                alt=""
                width={24}
                height={24}
                className={s.iconActive}
                priority={false}
              />
            </span>
            <span className={s.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
