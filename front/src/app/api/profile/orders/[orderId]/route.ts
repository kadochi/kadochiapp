import { getProfileOrder } from "@/features/profile/services/profile.server";
import { ServiceError } from "@/lib/http/errors";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const orderId = Number((await params).orderId);
    if (!Number.isSafeInteger(orderId) || orderId < 1) {
      throw new ServiceError({ code: "validation", status: 400, message: "Invalid order ID.", requestId: id, retryable: false });
    }
    return jsonOk(await getProfileOrder(orderId, id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
