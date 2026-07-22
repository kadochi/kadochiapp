import { createSavedAddress, listSavedAddresses } from "@/features/checkout/services/checkout.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await createSavedAddress(await request.json(), id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await listSavedAddresses(id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
