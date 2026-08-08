import { z } from "zod";
import { applyCartToken, executeCart } from "@/features/cart/services/cart.server";
import { jsonError, jsonOk, requestId, assertSameOrigin } from "@/lib/http/route";

const crossSellAddSchema = z.object({ productId: z.coerce.number().int().positive() }).strict();

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const { productId } = crossSellAddSchema.parse(await request.json());
    const result = await executeCart({
      method: "POST",
      path: "/wp-json/wc/store/v1/cart/add-item",
      body: { id: productId, quantity: 1, kadochi_cross_sell: true },
    }, id);
    const response = jsonOk(result.cart, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}
