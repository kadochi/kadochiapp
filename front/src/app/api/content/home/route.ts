import { getHomepageContent } from "@/features/content/services/content.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try { return jsonOk(await getHomepageContent(), id, { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }); }
  catch (error) { return jsonError(error, id); }
}
