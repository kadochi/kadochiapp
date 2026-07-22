import { listProfileProducts } from "@/features/profile/services/profile.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const number = Number(value ?? fallback);
  return Number.isInteger(number) && number > 0 && number <= maximum ? number : fallback;
}

export async function GET(request: Request) {
  const id = requestId(request);
  try {
    assertSameOrigin(request, id);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    const page = positiveInteger(url.searchParams.get("page"), 1, 100_000);
    const perPage = positiveInteger(url.searchParams.get("perPage"), 20, 50);
    return jsonOk(await listProfileProducts(action, page, perPage, id), id, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return jsonError(error, id);
  }
}
