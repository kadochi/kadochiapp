import { z } from "zod";

import { recordStoryView } from "@/features/content/services/content.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ storyId: string }> };

/** Same-origin bridge so story viewers never call WordPress directly. */
export async function POST(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const { storyId } = await params;
    await recordStoryView(z.coerce.number().int().positive().parse(storyId), id);
    return jsonOk({ ok: true }, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
