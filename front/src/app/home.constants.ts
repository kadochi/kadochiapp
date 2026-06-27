/**
 * Home page data constants — carousel query params, service-nav items, and
 * JSON-LD structured data. Extracted from app/page.tsx (no behavior change).
 */

import type { ServiceItem } from "@/components/layout/Services/ServicesNav";

export const LATEST_PARAMS = { orderby: "date", order: "desc", per_page: 12 };
export const POPULAR_PARAMS = {
  orderby: "popularity",
  order: "desc",
  per_page: 12,
};
export const FAST_DELIVERY_PARAMS = { tag: 25, per_page: 8 };

export const SERVICES_NAV_ITEMS: ServiceItem[] = [
  {
    label: "محصولات کادویی",
    href: "/products",
    icon: "/icons/all-gifts.svg",
    variant: "sq",
  },
  {
    label: "جستجوی کادوی مناسب",
    href: "/",
    icon: "/icons/giftf-inder.svg",
    variant: "sq",
    comingSoon: true,
  },
  {
    label: "تقویم مناسبت‌ها",
    href: "/occasions",
    icon: "/icons/ocassions-calendar.svg",
    variant: "sq",
  },
  {
    label: "ارسال سریع امروز",
    href: "/products?tag=fast-delivery",
    icon: "/icons/today-delivery.svg",
    variant: "sq",
  },
  {
    label: "کیک تولد و برگزاری تولد",
    href: "/products?category=chocolate",
    icon: "/icons/birthday-cake.svg",
    variant: "wide",
  },
  {
    label: "باکس گل و دسته‌گل",
    href: "/products?category=flower",
    icon: "/icons/flower-box.svg",
    variant: "wide",
  },
];

export const siteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  url: "https://kadochi.com/",
  name: "کادوچی",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://kadochi.com/products?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

export const orgLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "کادوچی",
  url: "https://kadochi.com/",
  logo: "https://kadochi.com/images/logo.svg",
};
