import { applyCartToken } from "@/features/cart/services/cart.server";
import { checkoutPaymentMethods } from "@/features/checkout/services/checkout.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const result = await checkoutPaymentMethods(id);
    const response = jsonOk({ items: result.items }, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}
