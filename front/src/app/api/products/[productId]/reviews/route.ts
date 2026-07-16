import { revalidateTag } from "next/cache";

import { createProductReviewInputSchema } from "@/features/products/schema/products";
import { createProductReview } from "@/features/products/services/products.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ productId: string }> };

export async function POST(request: Request, { params }: Context) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const body: unknown = await request.json();
    const { productId } = await params;
    const input = createProductReviewInputSchema.parse({
      ...(typeof body === "object" && body !== null ? body : {}),
      productId,
    });
    const result = await createProductReview(input, id);
    revalidateTag("product-reviews", "max");
    revalidateTag(`product:${input.productId}:reviews`, "max");
    return jsonOk(result, id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
