/**
 * Footer constants — route-hide patterns and link data.
 * Extracted from Footer.tsx (no behavior change).
 */

export type StoreCategory = {
  id: number;
  name: string;
  slug: string;
  image?: { src?: string | null } | null;
};

// Routes where footer should be hidden
export const HIDDEN_ROUTES: (string | RegExp)[] = [
  "/basket",
  "/login",
  "/auth/otp",
  "/checkout",
  "/profile",
  "/profile/info",
  "/profile/orders",
  "/checkout/success",
  "/checkout/zp-callback",
  /^\/product\/.+/,
  /orders\/.+/,
];

export const OCCASION_LINKS: Array<[label: string, href: string]> = [
  ["کادو جشن تولد", "/products?tag=birthday"],
  ["کادو سالگرد ازدواج", "/products?tag=anniversary"],
  ["کادو روز مادر", "/products?tag=motherday"],
  ["کادو روز پدر", "/products?tag=fatherday"],
  ["کادو ولنتاین", "/products?tag=valentine"],
  ["کادو شب یلدا", "/products?tag=yalda"],
  ["کادو سال نو", "/products?tag=newyear"],
  ["کادو فارغ التحصیلی", "/products?tag=graduation"],
];

export const CONTACT_LINKS: Array<[label: string, href: string]> = [
  ["تماس با ما", "/contact"],
  ["درباره ما", "/about"],
  ["قوانین و مقررات", "/terms"],
  ["حفظ حریم شخصی", "/privacy"],
  ["سوالات متداول", "/faq"],
];

export const SOCIAL_LINKS: Array<[name: string, icon: string, href: string]> = [
  ["Instagram", "social-instagram.svg", "https://www.instagram.com/kadochicom/"],
  ["Telegram", "social-telegram.svg", "https://t.me/kadochi_giftshop"],
  ["LinkedIn", "social-linkedin.svg", "https://www.linkedin.com/company/kadochi"],
  ["X", "social-twitter.svg", "https://x.com/kadochicom"],
];

export const BADGE_LINKS: Array<[src: string, alt: string, href: string]> = [
  [
    "/images/eanjoman.png",
    "اتحادیه کسب‌وکارهای مجازی",
    "https://ecunion.ir/",
  ],
  [
    "/images/brand.svg",
    "برند محبوب ایرانی ۱۳۹۸",
    "https://1398.irantopbrands.org/%D9%86%D8%AA%D8%A7%DB%8C%D8%A7%D8%AC_1398",
  ],
];
