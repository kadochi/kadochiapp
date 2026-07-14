import { verifyOtpInputSchema } from "@/features/auth/schema/auth";
import { getCurrentCustomer, storeAuthToken, verifyOtp } from "@/features/auth/services/auth.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const session = await verifyOtp(verifyOtpInputSchema.parse(await request.json()), id);
    const customer = await getCurrentCustomer(session.token, id);
    const response = jsonOk(customer, id, { headers: { "Cache-Control": "no-store" } });
    storeAuthToken(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return jsonError(error, id);
  }
}
