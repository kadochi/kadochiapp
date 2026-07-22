import { deleteSavedAddress, updateSavedAddress } from "@/features/checkout/services/checkout.server";
import { ServiceError } from "@/lib/http/errors";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ addressId: string }> };

async function addressIdFrom(params: Context["params"], requestIdValue: string) {
  const addressId = (await params).addressId;
  if (!/^[a-f0-9-]{36}$/i.test(addressId)) {
    throw new ServiceError({ code: "validation", status: 400, message: "Invalid address ID.", requestId: requestIdValue, retryable: false });
  }
  return addressId;
}

export async function PUT(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await updateSavedAddress(await addressIdFrom(params, id), await request.json(), id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    await deleteSavedAddress(await addressIdFrom(params, id), id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "X-Request-Id": id } });
  } catch (error) {
    return jsonError(error, id);
  }
}
