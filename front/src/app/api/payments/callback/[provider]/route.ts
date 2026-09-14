import { NextResponse } from "next/server";

import { parsePaymentCallback } from "@/features/payment/callbacks.server";
import { reconcilePaymentCallback } from "@/features/payment/payment.server";
import { paymentResultPath } from "@/features/payment/payment-state";
import { paymentProviderById } from "@/features/payment/providers";
import { requestId } from "@/lib/http/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ provider: string }> };

/**
 * A relative Location keeps the browser on its own public origin; behind the
 * reverse proxy `request.url` can carry the internal container host or scheme.
 */
function browserRedirect(path: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
}

function methodNotAllowed(request: Request): NextResponse {
  return new NextResponse(null, {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store", "x-request-id": requestId(request) },
  });
}

/** Public browser-return boundary. It never authenticates a customer or trusts callback data as payment proof. */
export async function GET(request: Request, { params }: Context) {
  const id = requestId(request);
  const provider = paymentProviderById((await params).provider);
  if (!provider) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-store", "x-request-id": id } });

  try {
    const callback = parsePaymentCallback(provider, new URL(request.url).searchParams);
    const state = await reconcilePaymentCallback(callback, id);
    console.info("[payment] callback_reconciled", {
      requestId: id,
      provider: provider.id,
      orderId: callback.orderId,
      state,
    });
    const response = browserRedirect(paymentResultPath(state, callback.orderId));
    response.headers.set("x-request-id", id);
    return response;
  } catch {
    console.warn("[payment] callback_rejected", { requestId: id, provider: provider.id });
    const response = browserRedirect("/checkout/failure?state=failed");
    response.headers.set("x-request-id", id);
    return response;
  }
}

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
export const HEAD = methodNotAllowed;
