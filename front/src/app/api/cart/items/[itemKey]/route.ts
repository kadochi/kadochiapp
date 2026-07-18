import { updateQuantitySchema } from "@/features/cart/schema/cart";
import { applyCartToken, executeCart } from "@/features/cart/services/cart.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ itemKey: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const input = updateQuantitySchema.parse(await request.json());
    const { itemKey } = await params;
    const result = await executeCart({ method: "POST", path: "/wp-json/wc/store/v1/cart/update-item", body: { key: itemKey, quantity: input.quantity } }, id);
    const response = jsonOk(result.cart, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) { return jsonError(error, id); }
}

export async function DELETE(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const { itemKey } = await params;
    const result = await executeCart({ method: "POST", path: "/wp-json/wc/store/v1/cart/remove-item", body: { key: itemKey } }, id);
    const response = jsonOk(result.cart, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) { return jsonError(error, id); }
}
