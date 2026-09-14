import { supportRequest } from "@/features/support/services/support.server";
import { jsonError,jsonOk,requestId } from "@/lib/http/route";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){const rid=requestId(request);try{const {id}=await params;const result=await supportRequest(`/conversations/${id}`,rid,{response:"conversation"});return jsonOk(result.data,rid,{headers:{"Cache-Control":"no-store"}});}catch(error){return jsonError(error,rid);}}

