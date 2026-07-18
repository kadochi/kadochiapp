import { updateCustomerSchema } from "@/features/cart/schema/cart";
import { applyCartToken, executeCart } from "@/features/cart/services/cart.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function PATCH(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const input = updateCustomerSchema.parse(await request.json());
    const result = await executeCart({ method: "POST", path: "/wp-json/wc/store/v1/cart/update-customer", body: { billing_address: input.billingAddress, shipping_address: input.shippingAddress } }, id);
    const response = jsonOk(result.cart, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, result.cartToken);
    return response;
  } catch (error) { return jsonError(error, id); }
}
