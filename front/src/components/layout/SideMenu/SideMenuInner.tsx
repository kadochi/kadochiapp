"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import s from "./SideMenu.module.css";
import { useSession } from "@/domains/auth";

type MenuItem = { label: string; href: string; icon: string };
type User = {
  name?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarSrc?: string | null;
};

const DEFAULT_ITEMS: MenuItem[] = [
  { label: "کادوچی", href: "/", icon: "/icons/home.svg" },
  { label: "محصولات", href: "/products", icon: "/icons/products.svg" },
  { label: "مناسبت‌ها", href: "/occasions", icon: "/icons/occasions.svg" },
  { label: "درباره ما", href: "/about", icon: "/icons/info.svg" },
  { label: "تماس با ما", href: "/contact", icon: "/icons/phone.svg" },
  { label: "قوانین و مقررات", href: "/terms", icon: "/icons/document.svg" },
  { label: "حفظ حریم شخصی", href: "/privacy", icon: "/icons/shield.svg" },
  { label: "سوالات متداول", href: "/faq", icon: "/icons/help.svg" },
];

export default function SideMenuInner({
  isOpen,
  onClose,
  isLoggedIn,
  user,
  items = DEFAULT_ITEMS,
}: {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  user?: User;
  items?: MenuItem[];
}) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const { session } = useSession();

  const logged =
    typeof isLoggedIn === "boolean"
      ? isLoggedIn
      : !!(session && session.userId);

  const mergedUser: User | undefined = logged
    ? {
        firstName: session?.firstName ?? user?.firstName ?? null,
        lastName: session?.lastName ?? user?.lastName ?? null,
        name:
          session?.name ??
          user?.name ??
          (session?.firstName || session?.lastName
            ? `${session?.firstName ?? ""} ${session?.lastName ?? ""}`.trim()
            : null),
        phone: session?.phone ?? user?.phone ?? null,
        avatarSrc: user?.avatarSrc ?? null,
      }
    : undefined;

  const displayName =
    mergedUser?.firstName || mergedUser?.lastName
      ? `${mergedUser?.firstName ?? ""} ${mergedUser?.lastName ?? ""}`.trim()
      : (mergedUser?.name && mergedUser.name.trim()) ||
        mergedUser?.phone ||
        (logged ? "کاربر" : "ورود / عضویت");

  const subtitle = "حساب کاربری";
  const profileHref = logged ? "/profile" : "/login";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    const el = portalRef.current;
    if (!el) return;

    if (isOpen) {
      el.removeAttribute("aria-hidden");
      el.removeAttribute("inert");
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-modal", "true");
    } else {
      el.setAttribute("aria-hidden", "true");
      el.setAttribute("inert", "");
      el.removeAttribute("role");
      el.removeAttribute("aria-modal");
    }
  }, [isOpen]);

  return (
    <div
      ref={portalRef}
      className={`${s.portal} ${isOpen ? s.open : s.closed}`}
      dir="rtl"
    >
      <button className={s.backdrop} aria-label="بستن منو" onClick={onClose} />
      <aside className={s.panel} aria-label="منوی کناری">
        <div className={s.rowClose}>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            className={s.close}
            aria-label="بستن"
          >
            <img
              src="/icons/close.svg"
              alt=""
              width={24}
              height={24}
              loading="lazy"
            />
          </button>
        </div>

        <Link href={profileHref} onClick={onClose} className={s.rowProfile}>
          <div className={s.profileWrap}>
            <div className={s.avatar}>
              <img
                src={mergedUser?.avatarSrc || "/icons/user-purple.svg"}
                alt=""
                width={40}
                height={40}
                loading="lazy"
              />
            </div>
            <div className={s.profileTexts}>
              <div className={s.profileTitle}>{displayName}</div>
              <div className={s.profileSub}>{subtitle}</div>
            </div>
          </div>
        </Link>

        <nav className={s.menu} aria-label="منو">
          <ul className={s.list}>
            {items.map((m) => (
              <li key={m.href}>
                <Link href={m.href} className={s.item} onClick={onClose}>
                  <img
                    className={s.itemIcon}
                    src={m.icon}
                    alt=""
                    width={24}
                    height={24}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className={s.itemLabel}>{m.label}</span>
                </Link>
                <hr className={s.divider} />
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
