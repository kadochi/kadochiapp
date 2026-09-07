import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import StateMessage from "@/components/layout/state-message";
import SectionHeader from "@/components/layout/section-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Label } from "@/components/ui/label";
import { ProductFilters } from "@/features/products/components/product-filters";
import { FlowerProductLinks } from "@/features/products/components/flower-product-links";
import { ProductList } from "@/features/products/components/product-list";
import { ProductListPagination } from "@/features/products/components/product-list-pagination";
import { listCategories, listProducts, listProductTags } from "@/features/products/services/products.server";
import type { ProductListResult, ProductQuery } from "@/features/products/types";
import {
  parseProductListSearchParams,
  productListSearchKey,
  type SearchParamValue,
} from "@/features/products/utils/product-list-search";
import { productUrl, serializeJsonLd } from "@/features/products/utils/product-seo";
import { redirectLegacyCategory } from "@/features/products/utils/redirect-legacy-category.server";
import { stripHtml } from "@/features/products/utils/strip-html";
import { env } from "@/lib/server/env";

// The "ارسال امروز" collection changes as checkout slots pass, so its
// eligibility must be recalculated for each catalog request.
export const dynamic = "force-dynamic";

type ProductsPageProps = {
  searchParams: Promise<Record<string, SearchParamValue>>;
};

const flowerTagPageTitles: Record<string, string> = {
  "flower-bouquet": "خرید دسته‌گل",
  "flower-box": "خرید باکس گل",
  "flower-jar": "خرید جار گل",
};

const listFilterOptions = cache(async () => {
  const [categories, tags] = await Promise.all([
    listCategories({ perPage: 100, hideEmpty: true }),
    listProductTags(),
  ]);
  return { categories, tags };
});

function emptyResult(page: number, perPage: number): ProductListResult {
  return { items: [], page, perPage, total: 0, totalPages: 0 };
}

const getCatalogPage = cache(async (searchKey: string) => {
  const search = JSON.parse(searchKey) as ReturnType<typeof parseProductListSearchParams>;
  const { categories, tags } = await listFilterOptions();
  const category = search.category
    ? categories.find((item) => String(item.id) === search.category || item.slug === search.category)
    : undefined;
  const selectedTags = search.tags.flatMap((reference) => {
    const tag = tags.find((item) => String(item.id) === reference || item.slug === reference);
    return tag ? [tag] : [];
  });
  const hasUnknownFilter = Boolean(search.category && !category) || selectedTags.length !== search.tags.length;
  const tagIds = selectedTags.map((tag) => tag.id);
  const query: ProductQuery = {
    page: search.page,
    perPage: 12,
    search: search.search,
    category: category?.id,
    tags: tagIds.length ? tagIds : undefined,
    tagOperator: tagIds.length > 1 ? "and" : undefined,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
    order: search.order,
    orderby: search.orderby,
    sameDayDelivery: search.sameDayDelivery || undefined,
  };
  const result = hasUnknownFilter ? emptyResult(search.page, 12) : await listProducts(query);

  return { hasUnknownFilter, search, categories, category, selectedTags, query, result };
});

function catalogSearchKey(searchParams: Record<string, SearchParamValue>) {
  return productListSearchKey(parseProductListSearchParams(searchParams));
}

/** Builds one stable query-string order for canonical, pagination, and internal URLs. */
function catalogPath({
  search,
  category,
  selectedTags,
  page,
}: {
  search: ReturnType<typeof parseProductListSearchParams>;
  category?: Awaited<ReturnType<typeof listCategories>>[number];
  selectedTags: Awaited<ReturnType<typeof listProductTags>>;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category.slug);
  if (selectedTags.length) params.set("tag", selectedTags.map((tag) => tag.slug).join(","));
  if (search.search) params.set("q", search.search);
  if (search.minPrice) params.set("min_price", search.minPrice);
  if (search.maxPrice) params.set("max_price", search.maxPrice);
  if (search.sameDayDelivery) params.set("delivery", "today");
  if (search.orderby !== "date") params.set("orderby", search.orderby);
  if (search.order !== "desc") params.set("order", search.order);
  if (page && page > 1) params.set("page", String(page));
  return `/products${params.size ? `?${params.toString()}` : ""}`;
}

function listRobots(index: boolean): Metadata["robots"] {
  return {
    index,
    follow: true,
    googleBot: {
      index,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  };
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const { hasUnknownFilter, result, search, category, selectedTags } =
    await getCatalogPage(catalogSearchKey(await searchParams));
  const selectedTag = selectedTags.length === 1 ? selectedTags[0] : undefined;
  const flowerTagTitle = selectedTag
    ? flowerTagPageTitles[selectedTag.slug]
    : search.tags.length === 1
      ? flowerTagPageTitles[search.tags[0]]
      : undefined;
  const title = search.sameDayDelivery
    ? "کادوهای قابل ارسال امروز"
    : category
    ? `خرید کادو ${category.name}`
    : flowerTagTitle
      ? flowerTagTitle
    : selectedTag
      ? `خرید کادو برای ${selectedTag.name}`
      : search.search
        ? `جستجو برای «${search.search}» در کادوچی`
        : "لیست محصولات کادویی";
  const description = search.sameDayDelivery
    ? "محصولاتی که با توجه به زمان آماده‌سازی و بازه‌های فعال تحویل، امروز قابل دریافت هستند."
    : category
    ? category.description || `خرید انواع هدیه و کادو در دسته‌بندی ${category.name} با امکان فیلتر بر اساس قیمت و مناسبت.`
    : selectedTag
      ? stripHtml(selectedTag.description) || `محصولات کادویی مناسب ${selectedTag.name} با ارسال سریع.`
      : search.search
        ? `نتایج جستجو برای «${search.search}» در فروشگاه کادوچی.`
        : "انواع هدایا و کادوهای مناسب برای مناسبت‌های مختلف، با امکان فیلتر بر اساس قیمت و دسته‌بندی.";
  const hasNonTaxonomyFacet = Boolean(
    search.search || search.minPrice || search.maxPrice || search.orderby !== "date" || search.order !== "desc",
  );
  const indexable = !hasUnknownFilter && !hasNonTaxonomyFacet && selectedTags.length <= 1 && result.total > 0 && search.page <= result.totalPages;
  const canonical = catalogPath({ category, page: search.page, search, selectedTags });

  return {
    title: `کادوچی | ${title}`,
    description: description.slice(0, 160),
    alternates: { canonical },
    robots: listRobots(indexable),
    openGraph: { title: `کادوچی | ${title}`, description: description.slice(0, 160), locale: "fa_IR", type: "website", url: canonical },
    twitter: { card: "summary", title: `کادوچی | ${title}`, description: description.slice(0, 160) },
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const resolvedSearchParams = await searchParams;
  await redirectLegacyCategory(resolvedSearchParams);
  const { hasUnknownFilter, search, categories, category, selectedTags, query, result } =
    await getCatalogPage(catalogSearchKey(resolvedSearchParams));
  if (!hasUnknownFilter && result.totalPages > 0 && search.page > result.totalPages) notFound();
  const selectedTag = selectedTags.length === 1 ? selectedTags[0] : undefined;
  const flowerTagTitle = selectedTag
    ? flowerTagPageTitles[selectedTag.slug]
    : search.tags.length === 1
      ? flowerTagPageTitles[search.tags[0]]
      : undefined;
  const title = search.sameDayDelivery
    ? "کادوهای قابل ارسال امروز"
    : category
    ? `لیست کادوهای ${category.name}`
    : flowerTagTitle
      ? flowerTagTitle
    : selectedTag
      ? `لیست کادوهای ${selectedTag.name}`
      : search.search
        ? `نتایج جستجو برای «${search.search}»`
        : "لیست محصولات کادویی";
  const subtitle = search.sameDayDelivery
    ? "محصولاتی که اکنون امکان تحویل در یکی از بازه‌های امروز را دارند"
    : category
    ? "انواع هدایا و کادوهای مرتبط با این دسته‌بندی"
    : selectedTag
      ? selectedTag.description || "محصولات کادویی متناسب با انتخاب شما"
      : "انواع محصولات مناسب برای هدیه و کادو";
  const breadcrumbs = [
    { label: "خانه", href: "/" },
    { label: "محصولات کادویی", href: "/products" },
    ...(search.sameDayDelivery ? [{ label: "ارسال امروز" }] : category ? [{ label: category.name }] : selectedTag ? [{ label: selectedTag.name }] : []),
  ];
  const catalogKey = `${productListSearchKey(search)}:${category?.id ?? ""}:${query.tags?.join(",") ?? ""}`;
  const paginationBasePath = catalogPath({ category, search, selectedTags });
  const siteUrl = new URL(env.KADOCHI_FRONTEND_URL);
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: new URL(item.href ?? catalogPath({ category, page: search.page, search, selectedTags }), siteUrl).toString(),
    })),
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: title,
    numberOfItems: result.items.length,
    itemListElement: result.items.map((product, index) => ({
      "@type": "ListItem",
      position: (search.page - 1) * result.perPage + index + 1,
      url: productUrl(product.slug, siteUrl),
      name: product.name,
    })),
  };

  return (
    <>
      <ProductFilters categories={categories} />
      <Divider />
      <Breadcrumb items={breadcrumbs} />
      <Divider />
      {category?.slug === "flower" ? <FlowerProductLinks /> : null}

      <section aria-label={title}>
        <SectionHeader
          as="h1"
          labelSlot={
            <Label appearance="soft" size="sm" variant="secondary">
              {new Intl.NumberFormat("fa-IR").format(result.total)} محصول
            </Label>
          }
          subtitle={subtitle}
          title={<span className="text-secondary">{title}</span>}
        />

        {result.items.length ? (
          <>
            <ProductList items={result.items} />
            <ProductListPagination
              key={catalogKey}
              initialProductIds={result.items.map((product) => product.id)}
              initialPage={result.page}
              paginationBasePath={paginationBasePath}
              query={query}
              totalPages={result.totalPages}
            />
          </>
        ) : (
          <StateMessage
            actions={
              <Button asChild size="medium" variant="tertiary-outline">
                <a href="/products">حذف همه فیلترها</a>
              </Button>
            }
            imageSrc="/images/illustration-empty.png"
            subtitle="فیلترها را تغییر دهید یا دسته‌بندی دیگری انتخاب کنید."
            title="محصولی پیدا نشد"
          />
        )}
      </section>
      <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbLd) }} type="application/ld+json" />
      <script dangerouslySetInnerHTML={{ __html: serializeJsonLd(itemListLd) }} type="application/ld+json" />
    </>
  );
}
