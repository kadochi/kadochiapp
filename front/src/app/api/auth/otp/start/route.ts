import { startOtpInputSchema } from "@/features/auth/schema/auth";
import { startOtp } from "@/features/auth/services/auth.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const result = await startOtp(startOtpInputSchema.parse(await request.json()), id);
    return jsonOk(result, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
