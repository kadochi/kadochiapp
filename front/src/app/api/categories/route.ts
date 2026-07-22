import { categoryQuerySchema } from "@/features/products/schema/products";
import { listCategories } from "@/features/products/services/products.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

/** Public BFF for client-side category lists, including the site footer. */
export async function GET(request: Request) {
  const id = requestId(request);

  try {
    const search = new URL(request.url).searchParams;
    const categories = await listCategories(
      categoryQuerySchema.parse({
        page: search.get("page") ?? undefined,
        perPage: search.get("perPage") ?? undefined,
        hideEmpty: search.get("hideEmpty") === "true",
      }),
    );

    return jsonOk(categories, id, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" },
    });
  } catch (error) {
    return jsonError(error, id);
  }
}
