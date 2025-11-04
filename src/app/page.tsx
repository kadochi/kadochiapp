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

export const revalidate = 60;

export default async function WPLatestProductsPage() {
  const latestParams = { orderby: "date", order: "desc", per_page: 12 };
  const popularParams = { orderby: "popularity", order: "desc", per_page: 12 };

  const siteLd = {
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

  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "کادوچی",
    url: "https://kadochi.com/",
    logo: "https://kadochi.com/images/logo.svg",
  };

  return (
    <>
      <HeroSlider />

      <ServicesNav
        items={[
          {
            label: "محصولات کادویی",
            href: "/products",
            icon: "/icons/all-gifts.svg",
            variant: "sq",
          },
          {
            label: "جستجوی کادوی مناسب",
            href: "/gifts",
            icon: "/icons/giftf-inder.svg",
            variant: "sq",
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
        ]}
      />

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
        <ProductCarousel wpParams={popularParams} />
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
        <ProductCarousel wpParams={latestParams} />
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
          wpParams={{ tag: 25, per_page: 8 }}
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
