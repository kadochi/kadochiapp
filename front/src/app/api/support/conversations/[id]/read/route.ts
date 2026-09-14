import { markReadSchema } from "@/features/support/schema/support";
import { supportRequest } from "@/features/support/services/support.server";
import { assertSameOrigin,jsonError,jsonOk,requestId } from "@/lib/http/route";
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,{params}:Context){const rid=requestId(request);try{assertSameOrigin(request,rid);const {id}=await params;const body=markReadSchema.parse(await request.json());const result=await supportRequest(`/conversations/${id}/read`,rid,{method:"POST",body,response:"unread"});return jsonOk(result.data,rid,{headers:{"Cache-Control":"no-store"}});}catch(error){return jsonError(error,rid);}}
