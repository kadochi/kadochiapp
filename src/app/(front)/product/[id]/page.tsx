// src/app/(front)/product/[id]/page.tsx
import "server-only";
import { Suspense } from "react";
import ImageGallery from "@/domains/catalog/components/ImageGallery/ImageGallery";
import ProductInfo from "./Sections/ProductInfo";
import { getProductDetail } from "@/domains/catalog/services/woo.server";
import Divider from "@/components/ui/Divider/Divider";
import SectionHeader from "@/components/layout/SectionHeader/SectionHeader";
import ProductTags from "./Sections/ProductTags";
import ProductDescription from "./Sections/ProductDescription";
import ProductReview from "./Sections/ProductReview";
import ProductSpecs from "./Sections/ProductSpecs";
import ProductComments from "./Sections/ProductComments";
import ActionBar from "./Sections/ActionBar";
import ActionBarSpacer from "./Sections/ActionBarSpacer";
import Label from "@/components/ui/Label/Label";
import Button from "@/components/ui/Button/Button";
import ProductCarousel from "@/domains/catalog/components/ProductCarousel/ProductCarousel";
import Breadcrumb from "@/components/ui/Breadcrumb/Breadcrumb";

export const revalidate = 300;

type Params = { id: string };

async function resolveParams(p: Params | Promise<Params>): Promise<Params> {
  const maybe = p as any;
  return typeof maybe?.then === "function" ? await maybe : (p as Params);
}

export default async function ProductPage({ params }: { params: Params }) {
  const { id } = await resolveParams(params);

  const productPromise = getProductDetail(id);

  const product = await productPromise;
  if (!product) {
    return (
      <main dir="rtl" style={{ paddingTop: 0 }}>
        <section style={{ padding: "24px 16px" }}>محصول پیدا نشد.</section>
      </main>
    );
  }

  const tagIds = Array.isArray(product.tags)
    ? product.tags.map((t) => t.id).filter(Boolean)
    : [];

  const primaryCategoryId =
    Array.isArray(product.categories) && product.categories.length
      ? product.categories[0]!.id
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
  const images = (product.images || []).map((im) => im.url);
  const amount = Number(product.price.amount || 0);
  const previous = product.previousPrice ?? null;
  const offPercent = product.offPercent ?? null;
  const ratingAvg = Number(product.ratingAvg || 0);
  const reviewsCount = Number(product.reviewsCount || 0);
  const primaryCat = product.categories?.[0];

  return (
    <main dir="rtl" style={{ paddingTop: 0 }}>
      <section>
        {/* ===== Hero Section ===== */}
        <ImageGallery images={images} title={title} />
        <ProductInfo
          title={title}
          amount={amount}
          previous={previous}
          offPercent={offPercent}
          currencyLabel="تومان"
          shippingLabel="ارسال ۱ روزکاری"
          reviewsCount={reviewsCount}
          ratingAvg={ratingAvg}
        />

        <Divider type="spacer" />

        {/* ===== Description ===== */}
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

        {/* ===== Similar Products (lazy loaded) ===== */}
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

        {/* ===== Reviews ===== */}
        <ProductReview
          productId={product.id}
          ratingAvg={product.ratingAvg}
          ratingCount={product.reviewsCount}
        />

        <Divider type="spacer" />

        {/* ===== Comments (lazy) ===== */}
        <Suspense
          fallback={<div style={{ padding: 16 }}>در حال دریافت نظرات...</div>}
        >
          <ProductComments comments={product.comments || []} />
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
        <ActionBarSpacer />
        <ActionBar
          productId={product.id}
          amount={Number(product.price.amount || 0)}
          previous={product.previousPrice ?? null}
          offPercent={product.offPercent ?? null}
          currencyLabel="تومان"
          min={1}
          max={9}
        />
      </section>
    </main>
  );
}
