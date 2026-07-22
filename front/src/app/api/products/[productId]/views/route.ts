import { z } from "zod";

import { recordProductView } from "@/features/products/services/products.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ productId: string }> };

/** Same-origin bridge so the browser never calls WordPress directly. */
export async function POST(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const { productId } = await params;
    await recordProductView(z.coerce.number().int().positive().parse(productId), id);
    return jsonOk({ ok: true }, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
