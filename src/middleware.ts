// middleware.ts
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/checkout", "/profile/info", "/profile/orders"];

const PUBLIC_PATHS = [
  "/checkout/zp-callback",
  "/checkout/success",
  "/checkout/failure",
  "/api/pay/start",
  "/api/pay/verify",
  "/api/orders",
];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return res;
  }

  const needsAuth = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!needsAuth) return res;

  const hasSession = !!req.cookies.get("kadochi_session")?.value;
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + (search || ""));
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: [
    "/checkout/:path*",
    "/profile/info/:path*",
    "/profile/orders/:path*",
    "/api/:path*",
  ],
};
