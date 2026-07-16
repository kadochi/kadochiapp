export type SearchParamValue = string | string[] | undefined;

export type ProductListSearch = {
  page: number;
  search?: string;
  category?: string;
  tags: string[];
  minPrice?: string;
  maxPrice?: string;
  order: "asc" | "desc";
  orderby: "date" | "price" | "popularity" | "rating";
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined) {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 100 ? page : 1;
}

function digits(value: string | undefined) {
  const normalized = value?.trim();
  return normalized && /^\d{1,12}$/.test(normalized) ? normalized : undefined;
}

/** Normalizes user-controlled PLP URL values without making the page dynamic. */
export function parseProductListSearchParams(
  values: Record<string, SearchParamValue>,
): ProductListSearch {
  const rawOrderby = firstValue(values.orderby)?.trim();
  const rawOrder = firstValue(values.order)?.trim();
  const rawTags = firstValue(values.tag);
  const tags = rawTags
    ? [...new Set(rawTags.split(",").map((tag) => tag.trim()).filter(Boolean))].slice(0, 20)
    : [];
  const search = firstValue(values.q)?.trim().slice(0, 100);
  const category = firstValue(values.category)?.trim().slice(0, 200);

  return {
    page: parsePage(firstValue(values.page)),
    search: search || undefined,
    category: category || undefined,
    tags,
    minPrice: digits(firstValue(values.min_price)),
    maxPrice: digits(firstValue(values.max_price)),
    order: rawOrder === "asc" ? "asc" : "desc",
    orderby:
      rawOrderby === "price" || rawOrderby === "popularity" || rawOrderby === "rating"
        ? rawOrderby
        : "date",
  };
}

export function productListSearchKey(search: ProductListSearch) {
  return JSON.stringify(search);
}
