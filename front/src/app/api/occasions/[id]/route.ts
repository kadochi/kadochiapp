import { deleteOccasionSchema, updateOccasionSchema } from "@/features/occasions/schema/occasions";
import { executeOccasions } from "@/features/occasions/services/occasions.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";

type Context = { params: Promise<{ id: string }> };
async function path(params: Context["params"]) { const { id } = await params; if (!/^\d+$/.test(id)) throw new Error("Invalid occasion ID."); return `/wp-json/kadochi/v1/occasions/${id}`; }

export async function GET(request: Request, { params }: Context) {
  const requestIdentifier = requestId(request);
  try { return jsonOk(await executeOccasions({ method: "GET", path: await path(params), response: "item" }, requestIdentifier), requestIdentifier, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return jsonError(error, requestIdentifier); }
}

export async function PATCH(request: Request, { params }: Context) {
  const requestIdentifier = requestId(request);
  try { assertSameOrigin(request); const body = updateOccasionSchema.parse(await request.json()); return jsonOk(await executeOccasions({ method: "PATCH", path: await path(params), body, response: "item" }, requestIdentifier), requestIdentifier, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return jsonError(error, requestIdentifier); }
}

export async function DELETE(request: Request, { params }: Context) {
  const requestIdentifier = requestId(request);
  try { assertSameOrigin(request); const body = deleteOccasionSchema.parse(await request.json()); return jsonOk(await executeOccasions({ method: "DELETE", path: await path(params), body, response: "item" }, requestIdentifier), requestIdentifier, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return jsonError(error, requestIdentifier); }
}
