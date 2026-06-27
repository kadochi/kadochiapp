import type { Metadata } from "next";
import HeroSlider from "@/components/layout/Hero/HeroSlider";
import ServicesNav from "@/components/layout/Services/ServicesNav";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import Button from "@/components/ui/Button/Button";
import Divider from "@/components/ui/Divider/Divider";
import ProductCarousel from "@/domains/catalog/components/ProductCarousel/ProductCarousel";
import CategoryCarousel from "@/domains/catalog/components/CategoryCarousel/CategoryCarousel";
import OccasionCarousel from "@/domains/occasions/components/OccasionCarousel/OccasionCarousel";
import OccasionLabel from "@/domains/occasions/components/OccasionLabel/OccasionLabel";
import AboutSection from "@/domains/statics/components/AboutSection/AboutSection";
import Label from "@/components/ui/Label/Label";
import Header from "@/components/layout/Header/Header";
import {
  FAST_DELIVERY_PARAMS,
  LATEST_PARAMS,
  orgLd,
  POPULAR_PARAMS,
  SERVICES_NAV_ITEMS,
  siteLd,
} from "./home.constants";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
  description:
    "کادوچی فروشگاه آنلاین خرید کادو، گل، باکس گل و کیک با ارسال سریع. انتخاب هدیه برای تولد، سالگرد، ولنتاین و سایر مناسبت‌ها با بسته‌بندی شیک.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
    description:
      "خرید انواع هدایا، گل و کیک با ارسال سریع و بسته‌بندی مخصوص هدیه در کادوچی.",
    url: "/",
  },
  twitter: {
    title: "کادوچی | خرید کادو، گل و کیک با ارسال سریع",
    description:
      "خرید اینترنتی کادو، گل و کیک با ارسال سریع برای مناسبت‌های مختلف.",
  },
};

export default async function WPLatestProductsPage() {
  return (
    <>
      <Header />
      <h1 className="sr-only">کادوچی | خرید کادو، گل و کیک با ارسال سریع</h1>
      <HeroSlider />
      <ServicesNav items={SERVICES_NAV_ITEMS} />
      <Divider type="spacer" />
      <section>
        <SectionHeader
          title="جدیدترین کادوها"
          subtitle="محصولاتی که به تازگی اضافه شده‌اند"
          leftSlot={
            <Button
              as="a"
              href="/products"
              type="link"
              style="ghost"
              size="small"
              trailingIcon={
                <img
                  src="/icons/chevron-left-black.svg"
                  alt=""
                  aria-hidden="true"
                />
              }
              aria-label="مشاهده همه"
            >
              مشاهده همه
            </Button>
          }
        />
        <ProductCarousel wpParams={LATEST_PARAMS} />
      </section>
      <Divider type="spacer" />
      <section>
        <SectionHeader
          title="مناسبت‌های پیش‌رو"
          subtitle="تقویم مناسبت‌های رسمی و شخصی"
          leftSlot={
            <Button
              as="a"
              href="/occasions"
              type="link"
              style="ghost"
              size="small"
              trailingIcon={
                <img
                  src="/icons/chevron-left-black.svg"
                  alt=""
                  aria-hidden="true"
                />
              }
              aria-label="مشاهده تقویم"
            >
              مشاهده تقویم
            </Button>
          }
        />
        <OccasionCarousel />
      </section>
      <Divider type="spacer" />
      <section>
        <SectionHeader
          title="محبوب‌ترین کادوها"
          subtitle="محصولاتی که بیشتر هدیه داده شده‌اند"
          leftSlot={
            <Button
              as="a"
              href="/products"
              type="link"
              style="ghost"
              size="small"
              trailingIcon={
                <img
                  src="/icons/chevron-left-black.svg"
                  alt=""
                  aria-hidden="true"
                />
              }
              aria-label="مشاهده همه"
            >
              مشاهده همه
            </Button>
          }
        />
        <ProductCarousel endpoint="/api/products" wpParams={POPULAR_PARAMS} />
      </section>
      <Divider type="spacer" />
      <section>
        <SectionHeader
          title="بی مناسبت؛ ولی با بهونه"
          subtitle="یه دلیل برای خوشحالی دیگران باش"
        />
        <OccasionLabel />
      </section>
      <Divider type="spacer" />
      <section>
        <SectionHeader
          title="کادوهای ارسال روز"
          subtitle="اگر خیلی سریع به دنبال یک کادو هستین"
          labelSlot={
            <Label
              type="primary"
              style="gradient"
              size="small"
              icon={
                <img
                  src="/icons/fast-delivery.svg"
                  width={14}
                  height={14}
                  alt=""
                  aria-hidden="true"
                />
              }
            >
              ارسال سریع
            </Label>
          }
          leftSlot={
            <Button
              as="a"
              href="/products"
              type="link"
              style="ghost"
              size="small"
              trailingIcon={
                <img
                  src="/icons/chevron-left-black.svg"
                  alt=""
                  aria-hidden="true"
                />
              }
              aria-label="مشاهده همه"
            >
              مشاهده همه
            </Button>
          }
        />
        <ProductCarousel
          endpoint="/api/products"
          wpParams={FAST_DELIVERY_PARAMS}
        />
      </section>
      <Divider type="spacer" />
      <AboutSection />
      <CategoryCarousel />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(siteLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
    </>
  );
}
