// src/app/(front)/product/[id]/page.tsx
import "server-only";
import { Suspense } from "react";
import type { Metadata } from "next";
import ImageGallery from "@/domains/catalog/components/ImageGallery/ImageGallery";
import ProductInfo from "./Sections/ProductInfo";
import { getProductDetail } from "@/lib/api/woo";
import Divider from "@/components/ui/Divider/Divider";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import ProductTags from "./Sections/ProductTags";
import ProductDescription from "./Sections/ProductDescription";
import ProductReview from "./Sections/ProductReview";
import ProductSpecs from "./Sections/ProductSpecs";
import ProductComments from "./Sections/ProductComments";
import ActionBar from "./Sections/ActionBar";
import Label from "@/components/ui/Label/Label";
import Button from "@/components/ui/Button/Button";
import ProductCarousel from "@/domains/catalog/components/ProductCarousel/ProductCarousel";
import Breadcrumb from "@/components/ui/Breadcrumb/Breadcrumb";
import Header from "@/components/layout/Header/Header";

export const revalidate = 300;

type Params = { id: string };

async function resolveParams(p: Params | Promise<Params>): Promise<Params> {
  const maybe = p as any;
  return typeof maybe?.then === "function" ? await maybe : (p as Params);
}

function stripHtml(input?: string | null) {
  if (!input) return "";
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateMetadata({
  params,
}: {
  params: Params | Promise<Params>;
}): Promise<Metadata> {
  const { id } = await resolveParams(params);
  const product = await getProductDetail(id);

  const canonical = `/product/${id}`;

  if (!product) {
    return {
      title: "محصول پیدا نشد | کادوچی",
      description: "این محصول در فروشگاه کادوچی یافت نشد.",
      alternates: { canonical },
    };
  }

  const title = product.name;

  const descSource =
    (product as any).shortDescriptionHtml ??
    (product as any).descriptionHtml ??
    "";
  const description =
    stripHtml(descSource) ||
    "خرید کادو و هدیه با بسته‌بندی شیک و ارسال سریع از فروشگاه کادوچی.";

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
    },
    twitter: {
      title,
      description,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await resolveParams(params);

  const product = await getProductDetail(id);
  if (!product) {
    return (
      <main dir="rtl" style={{ paddingTop: 0 }}>
        <section style={{ padding: "24px 16px" }}>محصول پیدا نشد.</section>
      </main>
    );
  }

  const tagIds = Array.isArray(product.tags)
    ? (product.tags as Array<{ id: number }>).map((t) => t.id).filter(Boolean)
    : [];

  const primaryCategoryId =
    Array.isArray(product.categories) && product.categories.length
      ? (product.categories[0] as { id: number }).id
      : undefined;

  const tagCsv = tagIds.slice(0, 3).join(",");

  const similarParams =
    primaryCategoryId || tagCsv
      ? {
          per_page: 8,
          orderby: "popularity",
          ...(primaryCategoryId ? { category: primaryCategoryId } : {}),
          ...(tagCsv ? { tag: tagCsv } : {}),
        }
      : { orderby: "popularity", per_page: 8 };

  const similarAllHref =
    primaryCategoryId || tagCsv
      ? `/products?${new URLSearchParams({
          ...(primaryCategoryId ? { category: String(primaryCategoryId) } : {}),
          ...(tagCsv ? { tag: tagCsv } : {}),
        }).toString()}`
      : `/products?orderby=popularity`;

  const title = product.name || "محصول";
  const images = (product.images || []).map((im: { url: string }) => im.url);
  const amount = Number(product.price.amount || 0);
  const previous = product.previousPrice ?? null;
  const offPercent = product.offPercent ?? null;
  const ratingAvg = Number(product.ratingAvg || 0);
  const reviewsCount = Number(product.reviewsCount || 0);
  const commentsCount = Number(product.reviewsCount || 0);
  const primaryCat = product.categories?.[0] as
    | { id: number; name: string }
    | undefined;

  return (
    <main dir="rtl" style={{ paddingTop: 0 }}>
      <Header />
      <section>
        <ImageGallery images={images} title={title} />

        <ProductInfo
          title={title}
          amount={amount}
          previous={previous}
          offPercent={offPercent}
          currencyLabel="تومان"
          shippingLabel="ارسال ۱ روزکاری"
          commentsCount={commentsCount}
          reviewsCount={reviewsCount}
          ratingAvg={ratingAvg}
          inStock={product.stock.inStock}
        />

        <Divider type="spacer" />

        <SectionHeader
          as="h3"
          title="درباره محصول"
          subtitle="توضیحات و بررسی"
          leftSlot={
            primaryCat ? (
              <Label type="secondary" style="tonal" size="medium">
                {primaryCat.name}
              </Label>
            ) : null
          }
        />
        <ProductDescription html={product.descriptionHtml} />

        <Divider type="spacer" />
        <ProductSpecs items={product.attributes} />

        <Divider type="spacer" />
        <ProductTags tags={product.tags} />

        <Divider type="spacer" />

        <SectionHeader
          title="محصولات مشابه"
          subtitle="کادوهای مشابه این محصول"
          leftSlot={
            <Button
              as="a"
              href={similarAllHref}
              type="link"
              style="ghost"
              size="small"
              trailingIcon={
                <img src="/icons/chevron-left-black.svg" alt="" aria-hidden />
              }
            >
              مشاهده همه
            </Button>
          }
        />
        <Suspense
          fallback={<div style={{ padding: 16 }}>در حال بارگذاری...</div>}
        >
          <ProductCarousel wpParams={similarParams} />
        </Suspense>

        <Divider type="spacer" />

        <ProductReview
          productId={product.id}
          ratingAvg={ratingAvg}
          ratingCount={reviewsCount}
        />

        <Divider type="spacer" />

        <Suspense
          fallback={<div style={{ padding: 16 }}>در حال دریافت نظرات...</div>}
        >
          <ProductComments productId={product.id} />
        </Suspense>

        <Divider />
        <Breadcrumb
          items={[
            { label: "خانه", href: "/" },
            { label: "محصولات", href: "/products" },
            ...(primaryCat
              ? [
                  {
                    label: primaryCat.name,
                    href: `/products?category=${primaryCat.id}`,
                  },
                ]
              : []),
            { label: title },
          ]}
        />
        <Divider />
        <ActionBar
          productId={product.id}
          amount={Number(product.price.amount || 0)}
          previous={product.previousPrice ?? null}
          offPercent={product.offPercent ?? null}
          currencyLabel="تومان"
          min={1}
          max={9}
          inStock={product.stock.inStock}
        />
      </section>
    </main>
  );
}
