// src/components/layout/Footer/Footer.tsx
"use client";

import Link from "next/link";
import s from "./Footer.module.css";
import {
  BADGE_LINKS,
  CONTACT_LINKS,
  OCCASION_LINKS,
  SOCIAL_LINKS,
} from "./footer.constants";
import { useFooterCategories, useHideFooter } from "./footer.hooks";

export default function Footer() {
  const hide = useHideFooter();
  const categories = useFooterCategories(hide);

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
                <Link href="/products" className={s.link}>
                  خرید کادو
                </Link>
              </li>
              <li>
                <Link href="/products?category=flower" className={s.link}>
                  خرید گل
                </Link>
              </li>
              <li>
                <Link href="/products?category=chocolate" className={s.link}>
                  خرید کیک تولد
                </Link>
              </li>
              <li>
                <Link href="/occasions" className={s.link}>
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
              {categories && categories.length > 0 ? (
                categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${encodeURIComponent(cat.id)}`}
                      className={s.link}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))
              ) : categories && categories.length === 0 ? (
                <li>موردی یافت نشد</li>
              ) : null /* render nothing while loading */}
            </ul>
          </section>

          {/* occasions */}
          <section className={s.group} aria-labelledby="footer-help">
            <h3 id="footer-help" className={s.groupTitle}>
              مناسبت‌ها
            </h3>
            <ul className={s.list}>
              {OCCASION_LINKS.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className={s.link}>
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
              {CONTACT_LINKS.map(([label, href]) => (
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
            {SOCIAL_LINKS.map(([name, icon, href]) => (
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
            {/* Enamad */}
            <a
              referrerPolicy="origin"
              target="_blank"
              href="https://trustseal.enamad.ir/?id=4427&Code=zAoYDxOli5GGolDnRLIO"
              className={s.badgeItem}
            >
              <img
                referrerPolicy="origin"
                src="https://trustseal.enamad.ir/logo.aspx?id=4427&Code=zAoYDxOli5GGolDnRLIO"
                alt="نماد اعتماد الکترونیکی"
                style={{ cursor: "pointer" }}
              />
              <span className={s.badgeTitle}>نماد اعتماد الکترونیکی</span>
            </a>

            {/* Other badges */}
            {BADGE_LINKS.map(([src, alt, href], i) => (
              <a
                key={i}
                className={s.badgeItem}
                href={href}
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
