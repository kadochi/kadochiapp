import { getPersonalProfile, updatePersonalProfile } from "@/features/profile/services/profile.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await getPersonalProfile(id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}

export async function PUT(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await updatePersonalProfile(await request.json(), id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
