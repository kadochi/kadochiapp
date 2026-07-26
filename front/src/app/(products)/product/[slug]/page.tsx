import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Divider } from "@/components/ui/divider";
import type { ServiceError } from "@/lib/http/errors";
import type { UpstreamError } from "@/lib/http/upstream";
import { ProductActionBar } from "@/features/products/components/product-action-bar";
import { ProductDescription } from "@/features/products/components/product-description";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { ProductInfo } from "@/features/products/components/product-info";
import { ProductReviews } from "@/features/products/components/product-reviews";
import { ProductReview } from "@/features/products/components/product-review";
import { ProductsSliderSkeleton, ProductReviewsSkeleton } from "@/features/products/components/product-detail-skeleton";
import { ProductSpecs } from "@/features/products/components/product-specs";
import { ProductTags } from "@/features/products/components/product-tags";
import { ProductViewTracker } from "@/features/products/components/product-view-tracker";
import { SimilarProducts } from "@/features/products/components/similar-products";
import { getProductByIdentifier } from "@/features/products/services/products.server";
import { productBreadcrumbs } from "@/features/products/utils/product-breadcrumbs";
import { isProductIdIdentifier } from "@/features/products/utils/product-identifier";
import {
  productBreadcrumbJsonLd,
  productDescription,
  productJsonLd,
  productPath,
  serializeJsonLd,
} from "@/features/products/utils/product-seo";
import { env } from "@/lib/server/env";

type Params = { slug: string };

const loadProduct = cache(async (identifier: string) => {
  try {
    return await getProductByIdentifier(identifier);
  } catch (error) {
    const detail = (error as ServiceError | UpstreamError)?.detail;
    if (detail?.code === "not_found") return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const canonical = product ? productPath(product.slug) : productPath(slug);

  if (!product) {
    return {
      title: "کادوچی | محصول پیدا نشد",
      description: "این محصول در فروشگاه کادوچی یافت نشد.",
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const productSummary = productDescription(product);
  const description = (
    productSummary
      ? `${product.name}؛ ${productSummary}`
      : `خرید ${product.name} با بسته‌بندی شیک و ارسال سریع از فروشگاه کادوچی.`
  ).slice(0, 160);
  const image = product.images[0];

  return {
    title: `کادوچی | ${product.name}`,
    description,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: "کادوچی",
      locale: "fa_IR",
      url: canonical,
      title: `کادوچی | ${product.name}`,
      description,
      images: image ? [{ url: image.url, alt: image.alt || product.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `کادوچی | ${product.name}`,
      description,
      images: image ? [{ url: image.url, alt: image.alt || product.name }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  // Google already knows the numeric URLs. A permanent redirect retains that
  // equity while ensuring there is one indexable, descriptive product URL.
  if (isProductIdIdentifier(slug) && product.slug !== slug) {
    permanentRedirect(`/product/${product.slug}`);
  }

  const category = product.categories[0];
  const siteUrl = new URL(env.KADOCHI_FRONTEND_URL);
  const productLd = productJsonLd(product, siteUrl);
  const breadcrumbLd = productBreadcrumbJsonLd(product, siteUrl);

  return (
    <>
      <ProductViewTracker productId={product.id} />
      <ProductGallery images={product.images} productId={product.id} title={product.name} />
      <ProductInfo product={product} />
      <Divider variant="spacer" />
      <ProductDescription product={product} />
      <Divider variant="spacer" />
      <ProductSpecs attributes={product.attributes} />

      {product.tags.length ? (
        <>
          <Divider variant="spacer" />
          <ProductTags tags={product.tags} />
        </>
      ) : null}
      <Divider variant="spacer" />

      <Suspense fallback={<ProductsSliderSkeleton />}>
        <SimilarProducts categoryId={category?.id} excludeId={product.id} />
      </Suspense>
      <Divider variant="spacer" />

      <ProductReview
        averageRating={product.averageRating}
        nextPath={`/product/${product.slug}`}
        productId={product.id}
        reviewCount={product.reviewCount}
      />
      <Divider variant="spacer" />

      <Suspense fallback={<ProductReviewsSkeleton />}>
        <ProductReviews productId={product.id} />
      </Suspense>

      <Divider />
      <Breadcrumb items={productBreadcrumbs(product)} />
      <Divider />

      <ProductActionBar product={product} />
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productLd) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }}
        type="application/ld+json"
      />
    </>
  );
}
