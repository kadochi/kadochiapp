"use client";

import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

type HomeCategory = {
  label: string;
  href: string;
  image: string;
};

const categories: readonly HomeCategory[] = [
  {
    href: "/products?delivery=today",
    image: "/images/home-categories/same-day-delivery.png",
    label: "ارسال امروز",
  },
  {
    href: "/products?tag=flower-bouquet",
    image: "/images/home-categories/flower-bouquet.png",
    label: "دسته گل",
  },
  {
    href: "/products?tag=flower-jar",
    image: "/images/home-categories/flower-jar.png",
    label: "گل جار",
  },
  {
    href: "/products?tag=flower-box",
    image: "/images/home-categories/flower-box.png",
    label: "باکس گل",
  },
  {
    href: "/products?tag=birthday",
    image: "/images/home-categories/birthday-gift.png",
    label: "کیک تولد",
  },
  {
    href: "/products",
    image: "/images/home-categories/gift-products.png",
    label: "هدیه و کادو",
  },
  {
    href: "/products",
    image: "/images/home-categories/bundles.png",
    label: "باندل‌ها",
  },
  {
    href: "/occasions",
    image: "/images/home-categories/occasions-calendar.png",
    label: "تقویم مناسبت‌ها",
  },
  {
    href: "/products?category=chocolate",
    image: "/images/home-categories/gift-chocolate.png",
    label: "شکلات کادویی",
  },
  {
    href: "/products",
    image: "/images/home-categories/custom-gift.png",
    label: "هدیه سفارشی",
  },
];

function CategoryCard({ category }: Readonly<{ category: HomeCategory }>) {
  return (
    <Link
      aria-label={category.label}
      className="relative flex flex-col items-center justify-start gap-4 px-2 py-4 text-center no-underline focus-visible:rounded-s focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary min-[860px]:px-0 min-[860px]:py-8"
      href={category.href}
      prefetch={false}
    >
      {/* These fixed, local illustrations do not need an image optimizer request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img alt="" className="size-88 object-contain" src={category.image} />
      <span className="line-clamp-1 w-full text-label-12 font-bold leading-[var(--text-label-12--line-height)] text-surface-neutral-high-emphasis min-[860px]:w-auto min-[860px]:whitespace-nowrap">
        {category.label}
      </span>
    </Link>
  );
}

/** A quick category rail placed immediately before the homepage hero. */
function HomeCategorySwiper() {
  return (
    <section
      aria-label="دسته‌بندی‌های پرطرفدار"
      className="mx-auto w-full pb-16 pt-8"
      dir="rtl"
    >
      <div className="min-[860px]:hidden">
        <Swiper
          className="home-category-swiper overflow-visible"
          slidesOffsetAfter={8}
          slidesOffsetBefore={8}
          slidesPerView={4.5}
          spaceBetween={4}
        >
          {categories.map((category) => (
            <SwiperSlide key={category.label}>
              <CategoryCard category={category} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
      <div className="hidden justify-center gap-16 px-8 min-[860px]:flex">
        {categories.map((category) => (
          <CategoryCard category={category} key={category.label} />
        ))}
      </div>
    </section>
  );
}

export { HomeCategorySwiper };
export default HomeCategorySwiper;
