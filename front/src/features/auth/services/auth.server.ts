import "server-only";

import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { requireConfiguredIdentity } from "@/lib/server/env";
import { customerSchema } from "../schema/auth";

export async function currentCustomer(cookie: string, requestId: string) {
  requireConfiguredIdentity();
  const response = await wordpressFetch("/wp-json/kadochi/v1/customer", { headers: cookie ? { Cookie: cookie } : {}, cache: "no-store", requestId });
  return parseUpstreamJson(response, (value) => customerSchema.parse(value), requestId);
}
