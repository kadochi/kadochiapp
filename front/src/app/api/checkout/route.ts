import { checkout, checkoutState } from "@/features/checkout/services/checkout.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";
export async function GET(request: Request) { const id = requestId(request); try { return jsonOk(await checkoutState(id), id, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return jsonError(error, id); } }
export async function POST(request: Request) { const id = requestId(request); try { assertSameOrigin(request); return jsonOk(await checkout(await request.json(), id), id, { headers: { "Cache-Control": "no-store" } }); } catch (error) { return jsonError(error, id); } }
