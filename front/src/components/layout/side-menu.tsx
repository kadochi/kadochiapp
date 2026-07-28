"use client";

/* eslint-disable @next/next/no-img-element -- Menu icons are legacy static assets and may be supplied by the host app. */

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cva } from "class-variance-authority";
import { UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type SideMenuItem = {
  label: string;
  href: string;
  icon: string;
};

type SideMenuUser = {
  name?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarSrc?: string | null;
};

/** The portion of an auth session the menu needs to render the profile link. */
type SideMenuSession = Omit<SideMenuUser, "avatarSrc"> & {
  userId?: string | number | null;
};

type SideMenuProps = {
  isOpen: boolean;
  onClose: () => void;
  isLoggedIn?: boolean;
  user?: SideMenuUser;
  items?: readonly SideMenuItem[];
  /**
   * Optional session data for applications that do not expose auth through a
   * hook. `isLoggedIn` still takes precedence when it is supplied.
   */
  session?: SideMenuSession | null;
};

const defaultMenuItems = [
  { label: "کادوچی", href: "/", icon: "/icons/home.svg" },
  { label: "محصولات", href: "/products", icon: "/icons/products.svg" },
  { label: "مناسبت‌ها", href: "/occasions", icon: "/icons/occasions.svg" },
  { label: "مجله", href: "/magazine", icon: "/icons/document.svg" },
  { label: "درباره ما", href: "/about", icon: "/icons/info.svg" },
  { label: "تماس با ما", href: "/contact", icon: "/icons/phone.svg" },
  { label: "قوانین و مقررات", href: "/terms", icon: "/icons/document.svg" },
  { label: "حفظ حریم شخصی", href: "/privacy", icon: "/icons/shield.svg" },
  { label: "سوالات متداول", href: "/faq", icon: "/icons/help.svg" },
] as const satisfies readonly SideMenuItem[];

const sideMenuPortalVariants = cva(
  "fixed inset-0 z-[1000] pointer-events-none [direction:ltr]",
  {
    variants: {
      open: {
        true: "pointer-events-auto [&_[data-slot=side-menu-backdrop]]:opacity-100 [&_[data-slot=side-menu-panel]]:translate-x-0",
        false: null,
      },
    },
    defaultVariants: {
      open: false,
    },
  },
);

function getProfileUser(
  isLoggedIn: boolean,
  session: SideMenuSession | null | undefined,
  user: SideMenuUser | undefined,
) {
  if (!isLoggedIn) {
    return undefined;
  }

  return {
    firstName: session?.firstName ?? user?.firstName ?? null,
    lastName: session?.lastName ?? user?.lastName ?? null,
    name:
      session?.name ??
      user?.name ??
      (session?.firstName || session?.lastName
        ? `${session.firstName ?? ""} ${session.lastName ?? ""}`.trim()
        : null),
    phone: session?.phone ?? user?.phone ?? null,
    avatarSrc: user?.avatarSrc ?? null,
  };
}

function getDisplayName(user: ReturnType<typeof getProfileUser>, isLoggedIn: boolean) {
  if (user?.firstName || user?.lastName) {
    return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  }

  return user?.name?.trim() || user?.phone || (isLoggedIn ? "کاربر" : "ورود / عضویت");
}

/**
 * A right-to-left off-canvas navigation menu.
 *
 * It remains mounted while closed so its existing CSS transitions, focus
 * target, and inert state are all managed from one component.
 */
function SideMenu({
  isOpen,
  onClose,
  isLoggedIn: isLoggedInOverride,
  user,
  items = defaultMenuItems,
  session,
}: Readonly<SideMenuProps>) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isLoggedIn = isLoggedInOverride ?? Boolean(session?.userId);
  const profileUser = getProfileUser(isLoggedIn, session, user);
  const displayName = getDisplayName(profileUser, isLoggedIn);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <div
      aria-hidden={isOpen ? undefined : true}
      aria-modal={isOpen || undefined}
      className={cn(sideMenuPortalVariants({ open: isOpen }))}
      dir="rtl"
      inert={isOpen ? undefined : true}
      role={isOpen ? "dialog" : undefined}
    >
      <button
        aria-label="بستن منو"
        className="absolute inset-0 cursor-pointer border-0 bg-surface-scrim opacity-0 transition-opacity duration-[220ms] ease-[ease]"
        data-slot="side-menu-backdrop"
        onClick={onClose}
        type="button"
      />

      <aside
        aria-label="منوی کناری"
        className="absolute top-0 right-0 grid h-full w-[min(90vw,320px)] grid-rows-[auto_auto_1fr] translate-x-full bg-surface-background transition-transform duration-[260ms] ease-[cubic-bezier(0.25,0.8,0.25,1)]"
        data-slot="side-menu-panel"
      >
        <div className="relative min-h-48">
          <button
            ref={closeButtonRef}
            aria-label="بستن"
            className="absolute top-16 left-16 flex size-32 cursor-pointer items-center justify-center border-0 bg-transparent p-0 outline-none"
            onClick={onClose}
            type="button"
          >
            <img alt="" height={24} loading="lazy" src="/icons/close.svg" width={24} />
          </button>
        </div>

        <Link
          className="px-24 py-16 no-underline"
          href={isLoggedIn ? "/profile" : "/login"}
          onClick={onClose}
          prefetch={false}
        >
          <div className="flex flex-row-reverse items-center gap-12">
            <Avatar
              alt={displayName}
              fallback={isLoggedIn ? undefined : <UserRound aria-hidden="true" />}
              size="lg"
              src={profileUser?.avatarSrc ?? undefined}
            />
            <div className="text-right">
              <div className="font-sans text-label-16 font-bold leading-[var(--text-label-16--line-height)] text-text-primary">
                {displayName}
              </div>
              <div className="mt-4 font-sans text-label-12 font-light leading-[var(--text-label-12--line-height)] text-text-secondary">
                حساب کاربری
              </div>
            </div>
          </div>
        </Link>

        <nav aria-label="منو">
          <ul className="m-0 list-none p-0">
            {items.map((item) => (
              <li key={item.href}>
                <Link
                  className="flex flex-row-reverse items-center gap-8 px-24 py-16 text-text-primary no-underline [-webkit-tap-highlight-color:transparent]"
                  href={item.href}
                  onClick={onClose}
                  prefetch={false}
                >
                  <img
                    alt=""
                    className="size-24"
                    decoding="async"
                    height={24}
                    loading="lazy"
                    src={item.icon}
                    width={24}
                  />
                  <span className="font-sans text-label-16 font-regular leading-[var(--text-label-16--line-height)]">
                    {item.label}
                  </span>
                </Link>
                <hr className="mx-24 my-0 border-0 border-b border-border-low-emphasis" />
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}

// Compatibility exports for callers of the legacy wrapper and inner component.
const SideMenuInner = SideMenu;
const SideMenuWrapper = SideMenu;

export {
  SideMenu,
  SideMenuInner,
  SideMenuWrapper,
  defaultMenuItems,
  sideMenuPortalVariants,
};
export type { SideMenuItem, SideMenuProps, SideMenuSession, SideMenuUser };
export default SideMenu;
