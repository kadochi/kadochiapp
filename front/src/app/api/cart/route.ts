import { executeCart, applyCartToken } from "@/features/cart/services/cart.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const result = await executeCart({ method: "GET", path: "/wp-json/wc/store/v1/cart" }, id);
    const response = jsonOk(result.cart, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) { return jsonError(error, id); }
}
