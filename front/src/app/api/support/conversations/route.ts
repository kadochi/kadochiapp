import { NextResponse } from "next/server";
import { createConversationSchema } from "@/features/support/schema/support";
import { storeGuestToken, supportRequest } from "@/features/support/services/support.server";
import { assertSameOrigin, jsonError, requestId } from "@/lib/http/route";
export async function POST(request:Request){const id=requestId(request);try{assertSameOrigin(request,id);const body=createConversationSchema.parse(await request.json());const result=await supportRequest("/conversations",id,{method:"POST",body,response:"conversation"});const response=NextResponse.json(result.data,{status:201,headers:{"Cache-Control":"no-store","x-request-id":id}});if(result.token)storeGuestToken(response,result.token);return response;}catch(error){return jsonError(error,id);}}

