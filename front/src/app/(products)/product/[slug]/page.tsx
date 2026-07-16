import { cache, Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Breadcrumb } from "@/components/ui/breadcrumb";
import type { ServiceError } from "@/lib/http/errors";
import type { UpstreamError } from "@/lib/http/upstream";
import { ProductActionBar } from "@/features/products/components/product-action-bar";
import { ProductDescription } from "@/features/products/components/product-description";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { ProductInfo } from "@/features/products/components/product-info";
import { ProductReviews } from "@/features/products/components/product-reviews";
import { ProductsSliderSkeleton, ProductReviewsSkeleton } from "@/features/products/components/product-detail-skeleton";
import { ProductSpecs } from "@/features/products/components/product-specs";
import { SimilarProducts } from "@/features/products/components/similar-products";
import { getProductBySlug } from "@/features/products/services/products.server";
import { productBreadcrumbs } from "@/features/products/utils/product-breadcrumbs";
import { stripHtml } from "@/features/products/utils/strip-html";

type Params = { slug: string };

const loadProduct = cache(async (slug: string) => {
  try {
    return await getProductBySlug(slug);
  } catch (error) {
    const detail = (error as ServiceError | UpstreamError)?.detail;
    if (detail?.code === "not_found") return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  const canonical = `/product/${slug}`;

  if (!product) {
    return {
      title: "محصول پیدا نشد | کادوچی",
      description: "این محصول در فروشگاه کادوچی یافت نشد.",
      alternates: { canonical },
    };
  }

  const description =
    stripHtml(product.shortDescription || product.description).slice(0, 160) ||
    "خرید کادو و هدیه با بسته‌بندی شیک و ارسال سریع از فروشگاه کادوچی.";
  const image = product.images[0];

  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: "کادوچی",
      locale: "fa_IR",
      title: product.name,
      description,
      images: image ? [{ url: image.url }] : undefined,
    },
    twitter: {
      title: product.name,
      description,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  const category = product.categories[0];

  return (
    <>
      <ProductGallery images={product.images} title={product.name} />
      <ProductInfo product={product} />
      <ProductDescription product={product} />
      <ProductSpecs attributes={product.attributes} />

      <Suspense fallback={<ProductsSliderSkeleton />}>
        <SimilarProducts categoryId={category?.id} excludeId={product.id} />
      </Suspense>

      <Suspense fallback={<ProductReviewsSkeleton />}>
        <ProductReviews productId={product.id} />
      </Suspense>

      <Breadcrumb items={productBreadcrumbs(product)} />

      <ProductActionBar product={product} />
    </>
  );
}
