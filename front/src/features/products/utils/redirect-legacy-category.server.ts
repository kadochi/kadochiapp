import "server-only";

import { permanentRedirect } from "next/navigation";

import { hasApiErrorCode } from "@/lib/http/errors";
import { getCategoryById } from "../services/products.server";
import { isNumericIdIdentifier } from "./product-identifier";
import {
  parseProductListSearchParams,
  productListPathWithCategory,
  type SearchParamValue,
} from "./product-list-search";

/** Redirects a legacy numeric category filter without changing any other URL state. */
export async function redirectLegacyCategory(searchParams: Record<string, SearchParamValue>) {
  const categoryReference = parseProductListSearchParams(searchParams).category;
  if (!categoryReference || !isNumericIdIdentifier(categoryReference)) return;

  try {
    const category = await getCategoryById(Number(categoryReference));
    permanentRedirect(productListPathWithCategory(searchParams, category.slug));
  } catch (error) {
    // An unknown numeric category keeps the catalog's established empty state.
    // Next's redirect error is intentionally rethrown by this predicate.
    if (!hasApiErrorCode(error, "not_found")) throw error;
  }
}
