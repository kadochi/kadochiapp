"use client";
/* eslint-disable @next/next/no-img-element -- Third-party trust seals and legacy static icons must retain their original loading behavior. */

import Link from "next/link";
import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Divider } from "@/components/ui/divider";

type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  image?: { src?: string | null } | null;
};

type FooterLink = {
  label: string;
  href: string;
};

type SocialLink = FooterLink & {
  icon: string;
};

type TrustBadge = FooterLink & {
  image: string;
};

const hiddenRoutes: readonly (string | RegExp)[] = [
  "/basket",
  "/login",
  "/auth/otp",
  "/checkout",
  /^\/profile(?:\/|$)/,
  "/checkout/success",
  "/checkout/zp-callback",
  /^\/product\/.+/,
  /orders\/.+/,
];

const primaryLinks = [
  { label: "صفحه اصلی", href: "/" },
  { label: "خرید کادو", href: "/products" },
  { label: "خرید گل", href: "/products?category=flower" },
  { label: "خرید کیک تولد", href: "/products?category=chocolate" },
  { label: "تقویم مناسبت‌ها", href: "/occasions" },
  { label: "مجله کادوچی", href: "/magazine" },
] as const satisfies readonly FooterLink[];

const occasionLinks = [
  { label: "کادو جشن تولد", href: "/products?tag=birthday" },
  { label: "کادو سالگرد ازدواج", href: "/products?tag=anniversary" },
  { label: "کادو روز مادر", href: "/products?tag=motherday" },
  { label: "کادو روز پدر", href: "/products?tag=fatherday" },
  { label: "کادو ولنتاین", href: "/products?tag=valentine" },
  { label: "کادو شب یلدا", href: "/products?tag=yalda" },
  { label: "کادو سال نو", href: "/products?tag=newyear" },
  { label: "کادو فارغ التحصیلی", href: "/products?tag=graduation" },
] as const satisfies readonly FooterLink[];

const contactLinks = [
  { label: "تماس با ما", href: "/contact" },
  { label: "درباره ما", href: "/about" },
  { label: "قوانین و مقررات", href: "/terms" },
  { label: "حفظ حریم شخصی", href: "/privacy" },
  { label: "سوالات متداول", href: "/faq" },
] as const satisfies readonly FooterLink[];

const socialLinks = [
  {
    label: "Instagram",
    icon: "social-instagram.svg",
    href: "https://instagram.com",
  },
  { label: "Telegram", icon: "social-telegram.svg", href: "https://t.me" },
  {
    label: "LinkedIn",
    icon: "social-linkedin.svg",
    href: "https://linkedin.com",
  },
  { label: "X", icon: "social-twitter.svg", href: "https://twitter.com" },
] as const satisfies readonly SocialLink[];

const trustBadges = [
  {
    image: "/images/eanjoman.png",
    label: "اتحادیه کسب‌وکارهای مجازی",
    href: "https://ecunion.ir/",
  },
  {
    image: "/images/brand.svg",
    label: "برند محبوب ایرانی ۱۳۹۸",
    href: "https://1398.irantopbrands.org/%D9%86%D8%AA%D8%A7%DB%8C%D8%A7%D8%AC_1398",
  },
] as const satisfies readonly TrustBadge[];

const categoryEndpoint = "/api/categories?perPage=100&hideEmpty=true";

const footerListClassName = "m-0 grid list-none gap-12 p-0";
const footerLinkClassName =
  "font-sans text-body-14 font-regular leading-[var(--text-body-14--line-height)] text-surface-neutral-mid-emphasis no-underline transition-colors duration-200 ease-in-out hover:text-primary";

function isFooterHidden(pathname: string) {
  return hiddenRoutes.some((route) =>
    typeof route === "string" ? pathname === route : route.test(pathname),
  );
}

function FooterLinkList({ links }: { links: readonly FooterLink[] }) {
  return (
    <ul className={footerListClassName}>
      {links.map(({ label, href }) => (
        <li key={href}>
          <Link className={footerLinkClassName} href={href}>
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function FooterGroup({
  children,
  id,
  title,
}: Readonly<{
  children: ReactNode;
  id: string;
  title: string;
}>) {
  return (
    <section aria-labelledby={id}>
      <h3
        className="mb-16 font-sans text-title-14 font-bold leading-[var(--text-title-14--line-height)] text-surface-neutral-high-emphasis"
        id={id}
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

function Footer() {
  const pathname = usePathname();
  const isHidden = isFooterHidden(pathname);
  const [categories, setCategories] = useState<StoreCategory[] | null>(null);

  useEffect(() => {
    if (isHidden) {
      return;
    }

    const controller = new AbortController();

    void fetch(categoryEndpoint, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: StoreCategory[]) => {
        if (controller.signal.aborted) {
          return;
        }

        setCategories(
          (data ?? [])
            .filter((category) => {
              const name = category.name.trim().toLowerCase();
              const slug = category.slug.trim().toLowerCase();

              return name !== "بدون دسته‌بندی" && slug !== "uncategorized";
            })
            .slice(0, 100),
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCategories([]);
        }
      });

    return () => controller.abort();
  }, [isHidden]);

  if (isHidden) {
    return null;
  }

  return (
    <footer
      aria-labelledby="footer-heading"
      className="hidden border-t border-surface bg-surface-soft font-sans text-text-primary min-[1025px]:block"
      data-component="footer"
    >
      <div className="box-border mx-auto w-full max-w-[1440px] px-16 py-32">
        <h2 className="sr-only" id="footer-heading">
          فوتر سایت کادوچی
        </h2>

        <div className="grid grid-cols-4 gap-24 [@media(max-width:1024px)]:grid-cols-2 [@media(max-width:1024px)]:row-gap-32">
          <FooterGroup id="footer-about" title="کادوچی">
            <FooterLinkList links={primaryLinks} />
          </FooterGroup>

          <FooterGroup id="footer-categories" title="دسته‌بندی‌ها">
            <ul className={footerListClassName}>
              {categories?.map((category) => (
                <li key={category.id}>
                  <Link
                    className={footerLinkClassName}
                    href={`/products?category=${encodeURIComponent(category.id)}`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
              {categories?.length === 0 ? <li>موردی یافت نشد</li> : null}
            </ul>
          </FooterGroup>

          <FooterGroup id="footer-help" title="مناسبت‌ها">
            <FooterLinkList links={occasionLinks} />
          </FooterGroup>

          <FooterGroup id="footer-legal" title="ارتباط">
            <FooterLinkList links={contactLinks} />
          </FooterGroup>
        </div>

        <Divider className="my-24" />

        <div className="flex flex-wrap items-center justify-between gap-16">
          <p className="m-0 font-sans text-label-12 font-regular leading-[var(--text-label-12--line-height)] text-surface-neutral-mid-emphasis">
            © {new Date().getFullYear()} کادوچی — تمامی حقوق محفوظ است.
          </p>

          <div aria-label="شبکه‌های اجتماعی" className="inline-flex items-center gap-16">
            {socialLinks.map(({ icon, label, href }) => (
              <a
                aria-label={label}
                className="inline-flex size-24 opacity-90 transition-[opacity,transform] duration-200 ease-in-out"
                href={href}
                key={label}
                rel="noopener noreferrer"
                target="_blank"
              >
                <img
                  alt=""
                  decoding="async"
                  height={20}
                  loading="lazy"
                  src={`/icons/${icon}`}
                  width={20}
                />
              </a>
            ))}
          </div>

          <div aria-label="نمادها" className="flex items-center gap-16">
            <a
              className="flex flex-col items-center gap-6 no-underline"
              href="https://trustseal.enamad.ir/?id=4427&Code=zAoYDxOli5GGolDnRLIO"
              referrerPolicy="origin"
              target="_blank"
            >
              <img
                alt="نماد اعتماد الکترونیکی"
                className="size-64 cursor-pointer object-contain"
                referrerPolicy="origin"
                src="https://trustseal.enamad.ir/logo.aspx?id=4427&Code=zAoYDxOli5GGolDnRLIO"
              />
              <span className="mt-4 w-88 text-center font-sans text-label-10 font-regular leading-[var(--text-label-10--line-height)] text-surface-neutral-mid-emphasis">
                نماد اعتماد الکترونیکی
              </span>
            </a>

            {trustBadges.map(({ image, label, href }) => (
              <a
                className="flex flex-col items-center gap-6 no-underline"
                href={href}
                key={image}
                rel="noopener noreferrer"
                target="_blank"
              >
                <img
                  alt={label}
                  className="size-64 object-contain"
                  decoding="async"
                  loading="lazy"
                  src={image}
                />
                <span className="mt-4 w-88 text-center font-sans text-label-10 font-regular leading-[var(--text-label-10--line-height)] text-surface-neutral-mid-emphasis">
                  {label}
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export { Footer, isFooterHidden };
export type { FooterLink, SocialLink, StoreCategory, TrustBadge };
export default Footer;
