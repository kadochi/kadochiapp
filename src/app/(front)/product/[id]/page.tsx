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

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://app.kadochi.com";

function toPlainText(input?: string | null): string {
  return String(input || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function toAbsoluteUrl(path: string): string {
  try {
    return new URL(path, SITE_URL).toString();
  } catch {
    return path;
  }
}

async function resolveParams(p: Params | Promise<Params>): Promise<Params> {
  const maybe = p as any;
  return typeof maybe?.then === "function" ? await maybe : (p as Params);
}

export async function generateMetadata({
  params,
}: {
  params: Params | Promise<Params>;
}): Promise<Metadata> {
  const resolved = await resolveParams(params);
  const product = await getProductDetail(resolved.id);

  const canonical = toAbsoluteUrl(`/product/${resolved.id}`);

  if (!product) {
    return {
      title: "محصول پیدا نشد",
      alternates: { canonical },
      openGraph: { title: "محصول پیدا نشد", url: canonical },
      twitter: { title: "محصول پیدا نشد" },
    };
  }

  const title = product.name || "محصول";
  const description = truncate(
    toPlainText(product.descriptionPlain || product.descriptionHtml) ||
      "مشاهده جزئیات محصول در کادوچی.",
    160
  );
  const images = (product.images || [])
    .map((img) => img?.url)
    .filter((src): src is string => Boolean(src));

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "product",
      images: images.length
        ? images.map((url) => ({ url }))
        : undefined,
    },
    twitter: {
      title,
      description,
      card: images.length ? "summary_large_image" : "summary",
      images: images.length ? images : undefined,
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
  const images = (product.images || [])
    .map((im: { url: string }) => im?.url)
    .filter((src): src is string => Boolean(src));
  const amount = Number(product.price.amount || 0);
  const previous = product.previousPrice ?? null;
  const offPercent = product.offPercent ?? null;
  const ratingAvg = Number(product.ratingAvg || 0);
  const reviewsCount = Number(product.reviewsCount || 0);
  const commentsCount = Number(product.reviewsCount || 0);
  const primaryCat = product.categories?.[0] as
    | { id: number; name: string }
    | undefined;

  const canonicalUrl = toAbsoluteUrl(`/product/${product.id}`);
  const priceValueRaw =
    product.salePrice?.amount ??
    product.price?.amount ??
    product.regularPrice?.amount ??
    0;
  const priceValue = Number(priceValueRaw);
  const priceCurrency =
    product.salePrice?.currency ||
    product.price?.currency ||
    product.regularPrice?.currency ||
    "IRR";

  const aggregateRating =
    ratingAvg > 0 && reviewsCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(ratingAvg).toFixed(1),
          reviewCount: reviewsCount,
        }
      : undefined;

  const additionalPropertyRaw = Array.isArray(product.attributes)
    ? product.attributes
        .filter((attr) => attr?.name && attr?.value)
        .map((attr) => ({
          "@type": "PropertyValue",
          name: attr.name,
          value: attr.value,
        }))
    : undefined;
  const additionalProperty =
    additionalPropertyRaw && additionalPropertyRaw.length
      ? additionalPropertyRaw
      : undefined;

  const productStructuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    name: title,
    description:
      toPlainText(product.descriptionPlain || product.descriptionHtml) || undefined,
    sku: String(product.id),
    mpn: String(product.id),
    url: canonicalUrl,
    image: images.length ? images : undefined,
    category: primaryCat?.name,
    brand: {
      "@type": "Brand",
      name: "کادوچی",
    },
    keywords:
      product.tags
        ?.map((tag) => tag?.name)
        .filter((name): name is string => Boolean(name))
        .join(", ") || undefined,
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency,
      price: Number(priceValue).toString(),
      availability: product.stock?.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "کادوچی",
      },
    },
    aggregateRating,
    additionalProperty,
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "خانه",
        item: toAbsoluteUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "محصولات",
        item: toAbsoluteUrl("/products"),
      },
      ...(primaryCat
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: primaryCat.name,
              item: toAbsoluteUrl(`/products?category=${primaryCat.id}`),
            },
          ]
        : []),
      {
        "@type": "ListItem",
        position: primaryCat ? 4 : 3,
        name: title,
        item: canonicalUrl,
      },
    ],
  };

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
        />
      </section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(productStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
      />
    </main>
  );
}
