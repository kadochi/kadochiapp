import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { z } from "zod";
import { wordpressBearerHeaders } from "@/features/auth/services/auth.server";
import { parseUpstreamJson, wordpressFetch } from "@/lib/http/upstream";
import { claimResultSchema, currentConversationSchema, supportMessagePageSchema, supportMessageSchema, unreadResultSchema } from "../schema/support";

const guestCookie = "kadochi_support_guest";
const guestHeader = "X-Kadochi-Support-Guest";
const guestMaxAge = 60 * 60 * 24 * 180;

export async function supportHeaders(): Promise<Record<string, string>> {
  const guest = (await cookies()).get(guestCookie)?.value;
  return { ...(await wordpressBearerHeaders()), ...(guest ? { [guestHeader]: guest } : {}) };
}

export function storeGuestToken(response: Pick<NextResponse, "cookies">, token: string): void {
  response.cookies.set(guestCookie, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: guestMaxAge });
}

export function clearGuestToken(response: Pick<NextResponse, "cookies">): void {
  response.cookies.set(guestCookie, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0), maxAge: 0 });
}

const responseSchemas = {
  conversation: currentConversationSchema,
  claim: claimResultSchema,
  messages: supportMessagePageSchema,
  message: supportMessageSchema,
  unread: unreadResultSchema,
} as const;

type ResponseKind = keyof typeof responseSchemas;

export async function supportRequest<K extends ResponseKind>(path: string, requestId: string, options: { method?: string; body?: unknown; response: K }): Promise<{ data: z.infer<(typeof responseSchemas)[K]>; token?: string }> {
  const upstream = await wordpressFetch(`/wp-json/kadochi/v1/support${path}`, {
    method: options.method ?? "GET",
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: { ...(await supportHeaders()), ...(options.body === undefined ? {} : { "Content-Type": "application/json" }) },
    cache: "no-store",
    requestId,
  });
  const token = upstream.headers.get(guestHeader) ?? undefined;
  const data = await parseUpstreamJson(upstream, (value) => responseSchemas[options.response].parse(value) as z.infer<(typeof responseSchemas)[K]>, requestId);
  return { data, token };
}
