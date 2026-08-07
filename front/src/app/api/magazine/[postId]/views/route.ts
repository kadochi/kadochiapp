import { z } from "zod";
import { recordMagazineView } from "@/features/magazine/services/magazine.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ postId: string }> };

/** Same-origin bridge so article viewers never call WordPress directly. */
export async function POST(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const { postId } = await params;
    await recordMagazineView(z.coerce.number().int().positive().parse(postId), id);
    return jsonOk({ ok: true }, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
