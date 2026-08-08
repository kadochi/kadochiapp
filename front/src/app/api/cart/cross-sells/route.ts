import { listCartCrossSellProducts } from "@/features/cart/services/cross-sells.server";
import { applyCartToken, executeCart } from "@/features/cart/services/cart.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

/** Refreshes recommendations from the current tokenized cart without exposing Woo tokens. */
export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const result = await executeCart({ method: "GET", path: "/wp-json/wc/store/v1/cart" }, id);
    const productIds = result.cart.items.filter((item) => !item.isCrossSell).map((item) => item.productId);
    const products = await listCartCrossSellProducts(productIds, id);
    const response = jsonOk(products, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}
