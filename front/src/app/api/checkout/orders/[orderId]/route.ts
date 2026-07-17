import { orderSummary } from "@/features/checkout/services/checkout.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    const orderId = Number((await params).orderId);
    if (!Number.isSafeInteger(orderId) || orderId < 1) throw new Error("Invalid order ID.");
    return jsonOk(await orderSummary(orderId, id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
