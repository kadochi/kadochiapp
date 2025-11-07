// src/components/layout/Footer/Footer.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import s from "./Footer.module.css";

type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  image?: { src?: string | null } | null;
};

// Routes where footer should be hidden
const HIDDEN_ROUTES: (string | RegExp)[] = [
  "/basket",
  "/login",
  "/auth/otp",
  "/checkout",
  "/checkout/success",
  "/checkout/zp-callback",
  /^\/product\/.+/,
];

function useHideFooter() {
  const pathname = usePathname();
  return useMemo(
    () =>
      HIDDEN_ROUTES.some((pattern) =>
        typeof pattern === "string"
          ? pathname === pattern
          : pattern.test(pathname)
      ),
    [pathname]
  );
}

export default function Footer() {
  const hide = useHideFooter();
  const [categories, setCategories] = useState<StoreCategory[] | null>(null);

  useEffect(() => {
    if (hide) return;
    let cancelled = false;

    // Fetch via same-origin proxy to avoid CORS
    const url = `/api/store/categories?per_page=100&hide_empty=true`;

    fetch(url, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: StoreCategory[]) => {
        if (cancelled) return;
        const filtered = (data || []).filter((c) => {
          const n = (c?.name || "").trim().toLowerCase();
          const s = (c?.slug || "").trim().toLowerCase();
          return n !== "بدون دسته‌بندی" && s !== "uncategorized";
        });
        setCategories(filtered.slice(0, 100));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });

    return () => {
      cancelled = true;
    };
  }, [hide]);

  if (hide) return null;

  return (
    <footer
      className={s.root}
      aria-labelledby="footer-heading"
      data-component="footer"
    >
      <div className={s.container}>
        <h2 id="footer-heading" className={s.visuallyHidden}>
          فوتر سایت کادوچی
        </h2>

        <div className={s.cols}>
          {/* about */}
          <section className={s.group} aria-labelledby="footer-about">
            <h3 id="footer-about" className={s.groupTitle}>
              کادوچی
            </h3>
            <ul className={s.list}>
              <li>
                <Link href="/" className={s.link}>
                  صفحه اصلی
                </Link>
              </li>
              <li>
                <Link href="/contact" className={s.link}>
                  کادو
                </Link>
              </li>
              <li>
                <Link href="/contact" className={s.link}>
                  گل
                </Link>
              </li>
              <li>
                <Link href="/contact" className={s.link}>
                  کیک تولد
                </Link>
              </li>
              <li>
                <Link href="/contact" className={s.link}>
                  تقویم مناسبت‌ها
                </Link>
              </li>
            </ul>
          </section>

          {/* categories */}
          <section className={s.group} aria-labelledby="footer-categories">
            <h3 id="footer-categories" className={s.groupTitle}>
              دسته‌بندی‌ها
            </h3>
            <ul className={s.list}>
              {
                categories && categories.length > 0 ? (
                  categories.map((cat) => (
                    <li key={cat.id}>
                      <Link
                        href={`/products?category=${encodeURIComponent(
                          cat.id
                        )}`}
                        className={s.link}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))
                ) : categories && categories.length === 0 ? (
                  <li>موردی یافت نشد</li>
                ) : null /* render nothing while loading */
              }
            </ul>
          </section>

          {/* occasions */}
          <section className={s.group} aria-labelledby="footer-help">
            <h3 id="footer-help" className={s.groupTitle}>
              مناسبت‌ها
            </h3>
            <ul className={s.list}>
              {[
                "کادو جشن تولد",
                "کادو روز مادر",
                "کادو روز پدر",
                "کادو سالگرد ازدواج",
                "کادو ولنتاین",
                "کادو شب یلدا",
                "کادو سال نو",
                "کادو فارغ التحصیلی",
              ].map((label, i) => (
                <li key={i}>
                  <Link href="/occasions" className={s.link}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* contact */}
          <section className={s.group} aria-labelledby="footer-legal">
            <h3 id="footer-legal" className={s.groupTitle}>
              ارتباط
            </h3>
            <ul className={s.list}>
              {[
                ["تماس با ما", "/contact"],
                ["درباره ما", "/about"],
                ["قوانین و مقررات", "/terms"],
                ["حفظ حریم شخصی", "/privacy"],
                ["همکاری", "/careers"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className={s.link}>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <hr className={s.divider} />

        {/* bottom row */}
        <div className={s.bottomRow}>
          <p className={s.copy}>
            © {new Date().getFullYear()} کادوچی — تمامی حقوق محفوظ است.
          </p>

          <div className={s.socials} aria-label="شبکه‌های اجتماعی">
            {[
              ["Instagram", "social-instagram.svg", "https://instagram.com"],
              ["Telegram", "social-telegram.svg", "https://t.me"],
              ["LinkedIn", "social-linkedin.svg", "https://linkedin.com"],
              ["X", "social-twitter.svg", "https://twitter.com"],
            ].map(([name, icon, href]) => (
              <a
                key={name}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={name}
                className={s.socialLink}
              >
                <img
                  src={`/icons/${icon}`}
                  alt=""
                  width={20}
                  height={20}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            ))}
          </div>

          <div className={s.enamad} aria-label="نمادها">
            {[
              ["/images/enamad.png", "نماد اعتماد الکترونیکی"],
              ["/images/eanjoman.png", "اتحادیه کسب‌وکارهای مجازی"],
              ["/images/brand.svg", "برند محبوب ایرانی ۱۳۹۸"],
            ].map(([src, alt], i) => (
              <a
                key={i}
                className={s.badgeItem}
                href="#"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={src} alt={alt} loading="lazy" decoding="async" />
                <span className={s.badgeTitle}>{alt}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
