import { createOccasionSchema, occasionListQuerySchema } from "@/features/occasions/schema/occasions";
import { executeOccasions } from "@/features/occasions/services/occasions.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    const search = new URL(request.url).searchParams;
    const query = occasionListQuerySchema.parse({ page: search.get("page") ?? undefined, perPage: search.get("perPage") ?? undefined });
    const path = `/wp-json/kadochi/v1/occasions?${new URLSearchParams({ page: String(query.page), per_page: String(query.perPage) })}`;
    return jsonOk(await executeOccasions({ method: "GET", path, response: "list" }, id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonError(error, id); }
}

export async function POST(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request);
    const input = createOccasionSchema.parse(await request.json());
    return jsonOk(await executeOccasions({ method: "POST", path: "/wp-json/kadochi/v1/occasions", body: input, response: "item" }, id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return jsonError(error, id); }
}
