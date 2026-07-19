import { updateProfile } from "@/features/profile/services/profile.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function PATCH(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await updateProfile(await request.json(), id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
