import { listNotifications, markNotificationsRead } from "@/features/profile/services/profile.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await listNotifications(id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}

export async function PATCH(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    return jsonOk(await markNotificationsRead(id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
