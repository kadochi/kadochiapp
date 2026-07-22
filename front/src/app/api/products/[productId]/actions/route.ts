import { z } from "zod";

import { getProductActions, updateProductAction } from "@/features/products/services/products.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ productId: string }> };

export async function GET(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    const { productId } = await params;
    return jsonOk(await getProductActions(z.coerce.number().int().positive().parse(productId), id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}

export async function PUT(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const body: unknown = await request.json();
    const { productId } = await params;
    const result = await updateProductAction({
      ...(typeof body === "object" && body !== null ? body : {}),
      productId,
    }, id);
    return jsonOk(result, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
