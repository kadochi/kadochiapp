import { clearAuthToken, getCurrentCustomer, getStoredAuthToken } from "@/features/auth/services/auth.server";
import { ServiceError } from "@/lib/http/errors";
import { UpstreamError } from "@/lib/http/upstream";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

function isUnauthenticated(error: unknown): boolean {
  return (error instanceof ServiceError || error instanceof UpstreamError) && error.detail.code === "unauthenticated";
}

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const customer = await getCurrentCustomer(await getStoredAuthToken(), id);
    return jsonOk(customer, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const response = jsonError(error, id);
    if (isUnauthenticated(error)) clearAuthToken(response);
    return response;
  }
}
