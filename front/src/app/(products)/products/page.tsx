import { cache } from "react";
import type { Metadata } from "next";

import StateMessage from "@/components/layout/state-message";
import SectionHeader from "@/components/layout/section-header";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Label } from "@/components/ui/label";
import { ProductFilters } from "@/features/products/components/product-filters";
import { ProductListPagination } from "@/features/products/components/product-list-pagination";
import { listCategories, listProducts, listProductTags } from "@/features/products/services/products.server";
import type { ProductListResult, ProductQuery } from "@/features/products/types";
import { parseProductListSearchParams, productListSearchKey, type SearchParamValue } from "@/features/products/utils/product-list-search";

type ProductsPageProps = {
  searchParams: Promise<Record<string, SearchParamValue>>;
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

async function getCatalogPage(searchParams: Record<string, SearchParamValue>) {
  const search = parseProductListSearchParams(searchParams);
  const { categories, tags } = await listFilterOptions();
  const category = search.category
    ? categories.find((item) => String(item.id) === search.category || item.slug === search.category)
    : undefined;
  const selectedTags = search.tags.map((reference) =>
    tags.find((item) => String(item.id) === reference || item.slug === reference),
  );
  const hasUnknownFilter = Boolean(search.category && !category) || selectedTags.some((tag) => !tag);
  const tagIds = selectedTags.flatMap((tag) => (tag ? [tag.id] : []));
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
  };
  const result = hasUnknownFilter ? emptyResult(search.page, 12) : await listProducts(query);

  return { search, categories, category, selectedTags: selectedTags.filter(Boolean), query, result };
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const { search, category, selectedTags } = await getCatalogPage(await searchParams);
  const selectedTag = selectedTags.length === 1 ? selectedTags[0] : undefined;
  const title = category
    ? `خرید کادو ${category.name}`
    : selectedTag
      ? `خرید کادو برای ${selectedTag.name}`
      : search.search
        ? `جستجو برای «${search.search}» در کادوچی`
        : "لیست محصولات کادویی";
  const description = category
    ? `انواع هدیه و کادو در دسته‌بندی ${category.name} با امکان فیلتر بر اساس قیمت و مناسبت.`
    : selectedTag
      ? selectedTag.description || `محصولات کادویی مناسب ${selectedTag.name} با ارسال سریع.`
      : search.search
        ? `نتایج جستجو برای «${search.search}» در فروشگاه کادوچی.`
        : "انواع هدایا و کادوهای مناسب برای مناسبت‌های مختلف، با امکان فیلتر بر اساس قیمت و دسته‌بندی.";
  const canonical = new URLSearchParams();
  if (search.category) canonical.set("category", search.category);
  if (search.tags.length) canonical.set("tag", search.tags.join(","));
  if (search.search) canonical.set("q", search.search);
  if (search.page > 1) canonical.set("page", String(search.page));

  return {
    title,
    description: description.slice(0, 160),
    alternates: { canonical: `/products${canonical.size ? `?${canonical}` : ""}` },
    openGraph: { title, description: description.slice(0, 160), locale: "fa_IR", type: "website" },
  };
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { search, categories, category, selectedTags, query, result } = await getCatalogPage(await searchParams);
  const selectedTag = selectedTags.length === 1 ? selectedTags[0] : undefined;
  const title = category
    ? `لیست کادوهای ${category.name}`
    : selectedTag
      ? `لیست کادوهای ${selectedTag.name}`
      : search.search
        ? `نتایج جستجو برای «${search.search}»`
        : "لیست محصولات کادویی";
  const subtitle = category
    ? "انواع هدایا و کادوهای مرتبط با این دسته‌بندی"
    : selectedTag
      ? selectedTag.description || "محصولات کادویی متناسب با انتخاب شما"
      : "انواع محصولات مناسب برای هدیه و کادو";
  const breadcrumbs = [
    { label: "خانه", href: "/" },
    { label: "محصولات کادویی", href: "/products" },
    ...(category ? [{ label: category.name }] : selectedTag ? [{ label: selectedTag.name }] : []),
  ];
  const catalogKey = `${productListSearchKey(search)}:${category?.id ?? ""}:${query.tags?.join(",") ?? ""}`;

  return (
    <>
      <ProductFilters categories={categories} />
      <Divider />
      <Breadcrumb items={breadcrumbs} />
      <Divider />

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
          <ProductListPagination
            key={catalogKey}
            initialItems={result.items}
            initialPage={result.page}
            query={query}
            totalPages={result.totalPages}
          />
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
    </>
  );
}
