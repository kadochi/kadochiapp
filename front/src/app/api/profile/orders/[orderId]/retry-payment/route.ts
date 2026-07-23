import { retryProfileOrderPayment } from "@/features/profile/services/profile.server";
import { ServiceError } from "@/lib/http/errors";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const parsedOrderId = Number((await context.params).orderId);
    if (!Number.isSafeInteger(parsedOrderId) || parsedOrderId <= 0) {
      throw new ServiceError({ code: "validation", status: 400, message: "Invalid order ID.", requestId: id, retryable: false });
    }
    return jsonOk(await retryProfileOrderPayment(parsedOrderId, id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
