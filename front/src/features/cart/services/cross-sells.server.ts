import "server-only";

import { z } from "zod";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { listProducts } from "@/features/products/services/products.server";

const crossSellResponseSchema = z.object({
  ids: z.array(z.number().int().positive()).max(5),
}).strict();

const sourceProductIdsSchema = z.array(z.number().int().positive()).max(50);

/** Resolves WooCommerce's merchant-configured cross-sell IDs into product cards. */
export async function listCartCrossSellProducts(productIds: readonly number[], requestId: string) {
  const sourceIds = sourceProductIdsSchema.parse([...new Set(productIds)]);
  if (!sourceIds.length) return [];

  const params = new URLSearchParams({ productIds: sourceIds.join(",") });
  const response = await wordpressFetch(`/wp-json/kadochi/v1/cart/cross-sells?${params}`, {
    cache: "no-store",
    requestId,
  });
  const { ids } = await parseUpstreamJson(response, (value) => crossSellResponseSchema.parse(value), requestId);
  if (!ids.length) return [];

  const products = (await listProducts({ include: ids, perPage: ids.length })).items;
  const byId = new Map(products.map((product) => [product.id, product]));
  return ids.flatMap((id) => {
    const product = byId.get(id);
    return product?.inStock && product.purchasable ? [product] : [];
  }).slice(0, 5);
}
