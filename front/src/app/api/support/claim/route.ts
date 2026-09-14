import { clearGuestToken, supportRequest } from "@/features/support/services/support.server";
import { assertSameOrigin, jsonError, jsonOk, requestId } from "@/lib/http/route";
export async function POST(request:Request){const id=requestId(request);try{assertSameOrigin(request,id);const result=await supportRequest("/claim",id,{method:"POST",response:"claim"});const response=jsonOk(result.data,id,{headers:{"Cache-Control":"no-store"}});clearGuestToken(response);return response;}catch(error){return jsonError(error,id);}}
