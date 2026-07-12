import { currentCustomer } from "@/features/auth/services/auth.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";

export async function GET(request: Request) {
  const id = requestId(request);
  try { return jsonOk(await currentCustomer(request.headers.get("cookie") ?? "", id), id, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return jsonError(error, id); }
}
