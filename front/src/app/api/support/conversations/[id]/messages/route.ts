import { sendMessageSchema } from "@/features/support/schema/support";
import { supportRequest } from "@/features/support/services/support.server";
import { assertSameOrigin,jsonError,jsonOk,requestId } from "@/lib/http/route";
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,{params}:Context){const rid=requestId(request);try{const {id}=await params;const search=new URL(request.url).searchParams;const query=new URLSearchParams({per_page:String(Math.max(1,Math.min(50,Number(search.get("perPage"))||30)))});for(const key of ["before","after"]){const value=search.get(key);if(value)query.set(key,value);}const result=await supportRequest(`/conversations/${id}/messages?${query}`,rid,{response:"messages"});return jsonOk(result.data,rid,{headers:{"Cache-Control":"no-store"}});}catch(error){return jsonError(error,rid);}}
export async function POST(request:Request,{params}:Context){const rid=requestId(request);try{assertSameOrigin(request,rid);const {id}=await params;const body=sendMessageSchema.parse(await request.json());const result=await supportRequest(`/conversations/${id}/messages`,rid,{method:"POST",body,response:"message"});return jsonOk(result.data,rid,{status:201,headers:{"Cache-Control":"no-store"}});}catch(error){return jsonError(error,rid);}}

