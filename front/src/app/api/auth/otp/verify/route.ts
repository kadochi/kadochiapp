import { verifyOtpInputSchema } from "@/features/auth/schema/auth";
import { getCurrentCustomer, jwtExpiry, storeAuthToken, verifyOtp } from "@/features/auth/services/auth.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const jwt = await verifyOtp(verifyOtpInputSchema.parse(await request.json()), id);
    const customer = await getCurrentCustomer(jwt.token, id);
    const response = jsonOk(customer, id, { headers: { "Cache-Control": "no-store" } });
    storeAuthToken(response, jwt.token, jwtExpiry(jwt.token, id));
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}
