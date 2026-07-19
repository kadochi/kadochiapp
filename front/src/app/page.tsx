import type { Metadata } from "next";
import Link from "next/link";

import HeroSlider, { type HeroSlide } from "@/components/layout/hero-slider";
import LayoutContent from "@/components/layout/layout-content";
import SectionHeader from "@/components/layout/section-header";
import ServicesNav from "@/components/layout/services-nav";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { AboutKadochi } from "@/features/landing/components/about-kadochi";
import { CategoryRail } from "@/features/landing/components/category-rail";
import { LandingProductRail } from "@/features/landing/components/landing-product-rail";
import { OccasionPrompt } from "@/features/landing/components/occasion-prompt";
import { UpcomingOccasionRail } from "@/features/landing/components/upcoming-occasion-rail";
import { getHomepageContent } from "@/features/content/services/content.server";
import type { HomepageContent } from "@/features/content/types";
import {
  listCategories,
  listProducts,
  listProductTags,
} from "@/features/products/services/products.server";
import type { Product, ProductCategory } from "@/features/products/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
  description:
    "کادوچی فروشگاه آنلاین خرید کادو، گل، باکس گل و کیک با ارسال سریع. انتخاب هدیه برای تولد، سالگرد، ولنتاین و سایر مناسبت‌ها با بسته‌بندی شیک.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
    description: "خرید انواع هدایا، گل و کیک با ارسال سریع و بسته‌بندی مخصوص هدیه در کادوچی.",
    locale: "fa_IR",
    type: "website",
    url: "/",
  },
  twitter: {
    title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
    description: "خرید اینترنتی کادو، گل و کیک با ارسال سریع برای مناسبت‌های مختلف.",
  },
};

const emptyContent: HomepageContent = {
  banners: [],
  heroes: [],
  sliders: [],
};

async function fallback<T>(operation: Promise<T>, value: T): Promise<T> {
  try {
    return await operation;
  } catch {
    return value;
  }
}

function toHeroSlides(content: HomepageContent): HeroSlide[] {
  const heroes = content.heroes.flatMap((hero) =>
    hero.title && hero.backgroundImage?.url
      ? [{
          backgroundImage: hero.backgroundImage.url,
          ctaLink: hero.ctaLink,
          ctaText: hero.ctaText,
          id: hero.id,
          title: hero.title,
        }]
      : [],
  );

  // Banners are the current content API's compatible editorial fallback when
  // a site has not migrated its legacy Hero records yet.
  return heroes.length
    ? heroes
    : content.banners.flatMap((banner) =>
        banner.title && banner.backgroundImage?.url
          ? [{
              backgroundImage: banner.backgroundImage.url,
              ctaLink: banner.ctaLink,
              ctaText: banner.ctaText,
              id: banner.id,
              title: banner.title,
            }]
          : [],
      );
}

async function getLandingData() {
  const [content, latest, popular, categories, tags] = await Promise.all([
    fallback(getHomepageContent(), emptyContent),
    fallback(listProducts({ order: "desc", orderby: "date", perPage: 12 }), { items: [] as Product[], page: 1, perPage: 12, total: 0, totalPages: 0 }),
    fallback(listProducts({ order: "desc", orderby: "popularity", perPage: 12 }), { items: [] as Product[], page: 1, perPage: 12, total: 0, totalPages: 0 }),
    fallback(listCategories({ hideEmpty: true, perPage: 12 }), [] as ProductCategory[]),
    fallback(listProductTags(), []),
  ]);
  const fastDeliveryTag = tags.find((tag) => tag.slug === "fast-delivery");
  const fastDelivery = fastDeliveryTag
    ? await fallback(
        listProducts({ order: "desc", orderby: "date", perPage: 12, tags: [fastDeliveryTag.id] }),
        { items: [] as Product[], page: 1, perPage: 12, total: 0, totalPages: 0 },
      )
    : { items: [] as Product[], page: 1, perPage: 12, total: 0, totalPages: 0 };

  return { categories, content, fastDelivery: fastDelivery.items, latest: latest.items, popular: popular.items };
}

const services = [
  { href: "/products", icon: "/icons/all-gifts.svg", label: "محصولات کادویی", variant: "sq" },
  { comingSoon: true, href: "/", icon: "/icons/giftf-inder.svg", label: "جستجوی کادوی مناسب", variant: "sq" },
  { href: "/occasions", icon: "/icons/ocassions-calendar.svg", label: "تقویم مناسبت‌ها", variant: "sq" },
  { href: "/products?tag=fast-delivery", icon: "/icons/today-delivery.svg", label: "ارسال سریع امروز", variant: "sq" },
  { href: "/products?category=chocolate", icon: "/icons/birthday-cake.svg", label: "کیک تولد و برگزاری تولد", variant: "wide" },
  { href: "/products?category=flower", icon: "/icons/flower-box.svg", label: "باکس گل و دسته‌گل", variant: "wide" },
] as const;

export default async function Homepage() {
  const { categories, content, fastDelivery, latest, popular } = await getLandingData();
  const heroSlides = toHeroSlides(content);
  const siteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "کادوچی",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://kadochi.com/products?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
    url: "https://kadochi.com/",
  };
  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    logo: "https://kadochi.com/images/logo.svg",
    name: "کادوچی",
    url: "https://kadochi.com/",
  };

  return (
    <LayoutContent mainClassName="mx-auto w-full max-w-[1440px]" showBottomNav>
      <h1 className="sr-only">کادوچی | خرید کادو، گل و کیک با ارسال سریع</h1>
      <HeroSlider initialSlides={heroSlides.length ? heroSlides : undefined} />
      <ServicesNav items={[...services]} />

      <Divider size="lg" variant="spacer" />
      <LandingProductRail
        href="/products?orderby=date&order=desc"
        items={latest}
        subtitle="محصولاتی که به تازگی اضافه شده‌اند"
        title="جدیدترین کادوها"
      />

      <Divider size="lg" variant="spacer" />
      <section aria-labelledby="occasion-calendar-heading" id="occasions">
        <SectionHeader
          as="h2"
          leftSlot={
            <Button asChild size="small" variant="link-ghost">
              <Link aria-label="مشاهده تقویم مناسبت‌ها" href="/occasions">مشاهده تقویم</Link>
            </Button>
          }
          subtitle="برای هر بهانه‌ای، یک هدیه به‌یادماندنی پیدا کنید"
          title={<span id="occasion-calendar-heading">مناسبت‌های پیش‌رو</span>}
        />
        <UpcomingOccasionRail />
      </section>

      <Divider size="lg" variant="spacer" />
      <LandingProductRail
        href="/products?orderby=popularity&order=desc"
        items={popular}
        subtitle="محصولاتی که بیشتر هدیه داده شده‌اند"
        title="محبوب‌ترین کادوها"
      />

      <Divider size="lg" variant="spacer" />
      <section aria-labelledby="just-because-heading">
        <SectionHeader
          as="h2"
          subtitle="یه دلیل برای خوشحالی دیگران باش"
          title={<span id="just-because-heading">بی‌مناسبت؛ ولی با بهونه</span>}
        />
        <OccasionPrompt />
      </section>

      <Divider size="lg" variant="spacer" />
      <LandingProductRail
        badge="fast-delivery"
        href="/products?tag=fast-delivery"
        items={fastDelivery}
        subtitle="اگر خیلی سریع به دنبال یک کادو هستین"
        title="کادوهای ارسال روز"
      />

      <Divider size="lg" variant="spacer" />
      <AboutKadochi />
      <CategoryRail items={categories} />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationLd) }} type="application/ld+json" />
    </LayoutContent>
  );
}
