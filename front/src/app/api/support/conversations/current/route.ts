import { supportRequest } from "@/features/support/services/support.server";
import { jsonError, jsonOk, requestId } from "@/lib/http/route";
export async function GET(request: Request) { const id=requestId(request); try { const result=await supportRequest("/conversations/current",id,{response:"conversation"}); return jsonOk(result.data,id,{headers:{"Cache-Control":"no-store"}}); } catch(error){return jsonError(error,id);} }

