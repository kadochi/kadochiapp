import { applyCartToken, clearCart } from "@/features/cart/services/cart.server";
import { orderSummary } from "@/features/checkout/services/checkout.server";
import { clearPaymentOrder, isPendingPaymentOrder } from "@/features/checkout/services/paid-cart.server";
import { ServiceError } from "@/lib/http/errors";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ orderId: string }> };

/** Clears the cart once for the order this browser just paid for. */
export async function POST(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const orderId = Number((await params).orderId);
    if (!Number.isSafeInteger(orderId) || orderId < 1) {
      throw new ServiceError({ code: "validation", status: 400, message: "Invalid order ID.", requestId: id, retryable: false });
    }
    if (!(await isPendingPaymentOrder(orderId))) {
      return jsonOk({ cleared: false }, id, { headers: { "Cache-Control": "no-store" } });
    }
    const summary = await orderSummary(orderId, id);
    if (summary.payment.state !== "paid") {
      return jsonOk({ cleared: false }, id, { headers: { "Cache-Control": "no-store" } });
    }
    const { cartToken } = await clearCart(id);
    const response = jsonOk({ cleared: true }, id, { headers: { "Cache-Control": "no-store" } });
    applyCartToken(response, cartToken);
    clearPaymentOrder(response);
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}
