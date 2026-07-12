import { bffJson } from "@/lib/http/browser";
import { ServiceError } from "@/lib/http/errors";
import { customerSchema } from "../schema/auth";
export const getCurrentCustomer = () => bffJson("/api/auth/current", { method: "GET" }, (value) => customerSchema.parse(value));
export async function requireCustomer() {
  try { return await getCurrentCustomer(); }
  catch (error) {
    if (error instanceof ServiceError && error.detail.code === "unauthenticated") throw error;
    throw error;
  }
}
