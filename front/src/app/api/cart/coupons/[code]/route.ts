import { couponCodeSchema } from "@/features/cart/schema/cart";
import { applyCartToken, removeCartCoupon } from "@/features/cart/services/cart.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ code: string }> };

export async function DELETE(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const { code } = couponCodeSchema.parse(await params);
    const result = await removeCartCoupon(code, id);
    const response = jsonOk(result.cart, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) { return jsonError(error, id); }
}
