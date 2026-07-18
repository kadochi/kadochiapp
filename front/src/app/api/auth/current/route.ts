import { clearAuthToken, getCurrentCustomer, getStoredAuthToken } from "@/features/auth/services/auth.server";
import { hasApiErrorCode } from "@/lib/http/errors";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const customer = await getCurrentCustomer(await getStoredAuthToken(), id);
    return jsonOk(customer, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = jsonError(error, id);
    if (hasApiErrorCode(error, "unauthenticated")) clearAuthToken(response);
    return response;
  }
}
