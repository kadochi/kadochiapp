import { applyCartToken } from "@/features/cart/services/cart.server";
import { checkout, checkoutState } from "@/features/checkout/services/checkout.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const result = await checkoutState(id);
    const response = jsonOk(result.state, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const completed = await checkout(await request.json(), id);
    const response = jsonOk(completed.result, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, completed.cartToken);
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}
