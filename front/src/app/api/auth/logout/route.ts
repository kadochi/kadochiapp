import { NextResponse } from "next/server";

import { clearAuthToken, getStoredAuthToken, revokeAuthToken } from "@/features/auth/services/auth.server";
import { assertSameOrigin, jsonError, requestId } from "@/lib/http/route";

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const token = await getStoredAuthToken();
    if (token) {
      try {
        await revokeAuthToken(token, id);
      } catch {
        // Local logout is authoritative for this browser even when optional upstream revocation is unavailable.
      }
    }
    const response = new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store", "x-request-id": id } });
    clearAuthToken(response);
    return response;
  } catch (error) {
    const response = jsonError(error, id);
    clearAuthToken(response);
    return response;
  }
}
