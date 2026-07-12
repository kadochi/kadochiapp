import { addItemSchema } from "@/features/cart/schema/cart";
import { applyCartToken, executeCart } from "@/features/cart/services/cart.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request);
    const input = addItemSchema.parse(await request.json());
    const result = await executeCart({ method: "POST", path: "/wp-json/wc/store/v1/cart/add-item", body: { id: input.productId, quantity: input.quantity, variation: input.variationId } }, id);
    const response = jsonOk(result.cart, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) { return jsonError(error, id); }
}
