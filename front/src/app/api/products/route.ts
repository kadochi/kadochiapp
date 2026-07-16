import { productQuerySchema } from "@/features/products/schema/products";
import { listProducts } from "@/features/products/services/products.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

/** Public BFF used only by the PLP's lower-level incremental pagination. */
export async function GET(request: Request) {
  const id = requestId(request);

  try {
    const search = new URL(request.url).searchParams;
    const query = productQuerySchema.parse({
      page: search.get("page") ?? undefined,
      perPage: search.get("perPage") ?? undefined,
      search: search.get("search") ?? undefined,
      category: search.get("category") ?? undefined,
      tags: search.get("tag")?.split(",").filter(Boolean),
      tagOperator: search.get("tagOperator") ?? undefined,
      minPrice: search.get("minPrice") ?? undefined,
      maxPrice: search.get("maxPrice") ?? undefined,
      order: search.get("order") ?? undefined,
      orderby: search.get("orderby") ?? undefined,
    });
    const result = await listProducts(query);
    return jsonOk(result, id, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    return jsonError(error, id);
  }
}
