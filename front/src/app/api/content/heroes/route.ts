import { getHeroSlides } from "@/features/content/services/content.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try { return jsonOk(await getHeroSlides(), id, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return jsonError(error, id); }
}
