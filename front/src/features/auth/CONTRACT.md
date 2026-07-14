# Auth contract

The auth slice uses WordPress as the production identity authority and includes an isolated local-development adapter. The browser calls only same-origin BFF routes; it never receives, stores, or decodes an auth token.

## Browser interface

- `startOtp({ phone })` calls `POST /api/auth/otp/start` and returns `{ expiresIn, retryAfter? }`.
- `verifyOtp({ phone, code })` calls `POST /api/auth/otp/verify` and returns a validated `Customer`.
- `getCurrentCustomer()` calls `GET /api/auth/current` and returns a `Customer`.
- `logout()` calls `POST /api/auth/logout` and resolves with no value.

`phone` accepts `09…`, `0098…`, and `+98…` Iranian mobile forms (Persian and Arabic numerals are normalized too) and is forwarded as `+989…`. OTP codes are 4–6 digits. The `AuthProvider`, `useAuth`, and `useOptionalAuth` exports in `auth-provider.tsx` expose customer, loading/authenticated/anonymous/error status, error, OTP actions, refresh, and logout. Login/logout events synchronize other tabs using BroadcastChannel with a localStorage fallback.

## BFF routes and WordPress contract

Every route sends `Cache-Control: no-store`, includes `x-request-id`, validates its request/response schema, uses the shared safe error shape, and never retries upstream calls.

| BFF route | WordPress request | Success response |
| --- | --- | --- |
| `POST /api/auth/otp/start` | `POST $WORDPRESS_OTP_REQUEST_PATH` with `{ phone }` | `{ expiresIn, retryAfter? }` |
| `POST /api/auth/otp/verify` | `POST $WORDPRESS_OTP_VERIFY_PATH` with `{ phone, code }`, then `GET /wp-json/kadochi/v1/customer` with `Authorization: Bearer <JWT>` | `Customer` only |
| `GET /api/auth/current` | `GET /wp-json/kadochi/v1/customer` with the cookie JWT as bearer auth | `Customer` |
| `POST /api/auth/logout` | Optional `POST $WORDPRESS_OTP_REVOKE_PATH` with bearer auth | `204 No Content` |

POST routes reject cross-site requests before contacting WordPress. Validation, upstream HTTP, rate-limit, timeout, unavailable-service, and malformed-response failures use the shared API error model. An absent, expired, or WordPress-rejected token yields `unauthenticated`; the local auth cookie is then cleared. Optional token revocation failure never prevents local logout.

## Local development

Set `KADOCHI_AUTH_MODE=local` (the Docker Compose default), then use phone `09121234567` and OTP `1234`. No SMS is sent. Successful verification issues a seven-day HS256 JWT with issuer, audience, subject, phone, issued-at, and expiry claims. The signed JWT is stored only in the HttpOnly auth cookie and validated on current-user requests. The browser receives the same `Customer` shape used by the WordPress flow. Local mode is rejected whenever `NODE_ENV=production`, so it cannot act as a deployment fallback.

The local adapter sits behind the existing `startOtp`, `verifyOtp`, `getCurrentCustomer`, and `logout` interfaces. Replacing it with the SMS-backed WordPress endpoints therefore requires configuration rather than changes to the login UI.

## Token handling and deployment

After OTP verification, the BFF first confirms the returned JWT with WordPress's customer endpoint. It then stores the opaque token in `kadochi_auth_token` with `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and an expiry taken from the required future numeric JWT `exp` claim. The token and JWT claims are never sent to browser code, and JWT claims are never used as customer data.

Set `KADOCHI_AUTH_MODE=wordpress-jwt`. `WORDPRESS_OTP_REQUEST_PATH` and `WORDPRESS_OTP_VERIFY_PATH` default to `/wp-json/kadochi/v1/auth/otp/start` and `/wp-json/kadochi/v1/auth/otp/verify`; each may be configured as a relative REST path. `WORDPRESS_OTP_REVOKE_PATH` is optional.

The deployed WordPress plugin/API must issue and rate-limit OTPs, exchange a valid OTP for `{ token: <JWT> }` with a future numeric `exp`, authenticate that JWT on `/wp-json/kadochi/v1/customer`, and optionally support revocation. This is intentionally an explicit WordPress deployment prerequisite: WordPress core's browser REST authentication is cookie-plus-nonce, while JWT authentication requires custom plugin support. See [WordPress REST API authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/).
