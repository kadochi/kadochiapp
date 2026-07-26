import { clearAuthToken, getCurrentCustomer, getStoredAuthToken } from "@/features/auth/services/auth.server";
import { hasApiErrorCode } from "@/lib/http/errors";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const customer = await getCurrentCustomer(await getStoredAuthToken(), id);
    return jsonOk(customer, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (hasApiErrorCode(error, "unauthenticated")) {
      const response = jsonOk(null, id, {
        headers: { "Cache-Control": "no-store" },
      });
      clearAuthToken(response);
      return response;
    }
    const response = jsonError(error, id);
    return response;
  }
}
