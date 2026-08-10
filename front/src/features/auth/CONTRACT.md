# Auth contract

WordPress owns OTP verification and JWT issuance in every environment. The browser calls only same-origin BFF routes; it never receives, stores, or decodes an auth token.

## Browser interface

- `startOtp({ phone })` calls `POST /api/auth/otp/start` and returns `{ expiresIn, retryAfter?, codeLength? }`.
- `verifyOtp({ phone, code })` calls `POST /api/auth/otp/verify` and returns a validated `Customer` with canonical `phone`, `firstName`, and `lastName`.
- `getCurrentCustomer()` calls `GET /api/auth/current` and returns a `Customer`.
- `logout()` calls `POST /api/auth/logout` and resolves with no value.

`phone` accepts `09…`, `0098…`, and `+98…` Iranian mobile forms (Persian and Arabic numerals are normalized too) and is forwarded as `+989…`. OTP codes are 4–6 digits. The `AuthProvider`, `useAuth`, and `useOptionalAuth` exports in `auth-provider.tsx` expose customer, loading/authenticated/anonymous/error status, error, OTP actions, refresh, and logout. Login/logout events synchronize other tabs using BroadcastChannel with a localStorage fallback.

## BFF routes

Every route sends `Cache-Control: no-store`, includes `x-request-id`, validates its request/response schema, uses the shared safe error shape, and never retries upstream calls.

| BFF route | Server action | Success response |
| --- | --- | --- |
| `POST /api/auth/otp/start` | Proxies to WordPress's fixed OTP start route | `{ expiresIn, retryAfter?, codeLength? }` |
| `POST /api/auth/otp/verify` | Proxies WordPress verification, stores its opaque JWT, and returns the customer | `Customer` only |
| `GET /api/auth/current` | Reads the cookie and asks WordPress for the current customer | `Customer` |
| `POST /api/auth/logout` | Clears the local cookie | `204 No Content` |

POST routes reject cross-site requests before contacting upstream services. Validation, upstream HTTP, rate-limit, timeout, unavailable-service, and malformed-response failures use the shared API error model. An absent, expired, or rejected token yields `unauthenticated`; the auth cookie is then cleared.

## WordPress authentication contract

Kadochi Core exposes `POST /wp-json/kadochi/v1/auth/otp/start` and `POST /wp-json/kadochi/v1/auth/otp/verify`. In production, both routes require a short-lived, payload-bound HMAC from the Next.js BFF using `KADOCHI_INTERNAL_API_SECRET`; direct public calls are rejected. The start endpoint accepts `{ phone }` and returns `{ expiresIn, retryAfter, codeLength }`. The verify endpoint accepts `{ phone, code }` and returns `{ token, expiresIn, customer }` to the BFF only. The BFF validates that response, returns only `Customer` to the browser, and stores `token` as `kadochi_auth_token` with `HttpOnly`, `SameSite=Lax`, `Secure` in production, and `Path=/`.

When `WP_ENVIRONMENT_TYPE` is `local` or `development`, only `09121234567` with code `1234` is accepted and no SMS request is made. Otherwise WordPress calls `MELIPAYAMAK_OTP_URL` with `{ "to": "0912…" }` and requires `{ "code": "1234" }`. It stores only a keyed OTP digest in a 180-second transient, enforces a 60-second resend cooldown, five verification attempts, a per-phone hourly cap, and a global hourly attempt circuit breaker. Per-phone MySQL locks serialize send, resend, and verification state changes; a successful verification consumes the challenge before a JWT response is returned. It resolves users by canonical phone metadata, WooCommerce billing phone, or phone username; unknown phones become WooCommerce customers without REST administrator credentials.

WordPress issues a seven-day HS256 JWT with validated issuer, audience, numeric subject, phone, issued-at, and expiry claims. The signing key is domain-separated from `wp_salt( 'auth' )`. The `determine_current_user` filter accepts only valid bearer tokens and protected customer/occasion routes require `current_user_can( 'read' )`. Occasions use the same server-side bearer bridge; guest cart and checkout continue to use their separate cart-token behavior.
