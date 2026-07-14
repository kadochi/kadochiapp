# Auth contract

The auth slice supports a direct MeliPayamak production adapter, a WordPress-JWT adapter, and an isolated local-development adapter. The browser calls only same-origin BFF routes; it never receives, stores, or decodes an auth token.

## Browser interface

- `startOtp({ phone })` calls `POST /api/auth/otp/start` and returns `{ expiresIn, retryAfter?, codeLength? }`.
- `verifyOtp({ phone, code })` calls `POST /api/auth/otp/verify` and returns a validated `Customer`.
- `getCurrentCustomer()` calls `GET /api/auth/current` and returns a `Customer`.
- `logout()` calls `POST /api/auth/logout` and resolves with no value.

`phone` accepts `09…`, `0098…`, and `+98…` Iranian mobile forms (Persian and Arabic numerals are normalized too) and is forwarded as `+989…`. OTP codes are 4–6 digits. The `AuthProvider`, `useAuth`, and `useOptionalAuth` exports in `auth-provider.tsx` expose customer, loading/authenticated/anonymous/error status, error, OTP actions, refresh, and logout. Login/logout events synchronize other tabs using BroadcastChannel with a localStorage fallback.

## BFF routes

Every route sends `Cache-Control: no-store`, includes `x-request-id`, validates its request/response schema, uses the shared safe error shape, and never retries upstream calls.

| BFF route | Server action | Success response |
| --- | --- | --- |
| `POST /api/auth/otp/start` | Starts the configured local, MeliPayamak, or WordPress-JWT challenge | `{ expiresIn, retryAfter?, codeLength? }` |
| `POST /api/auth/otp/verify` | Verifies the configured challenge, then resolves the customer | `Customer` only |
| `GET /api/auth/current` | Reads the signed session and resolves the configured customer authority | `Customer` |
| `POST /api/auth/logout` | Clears the local session; WordPress-JWT may also revoke upstream | `204 No Content` |

POST routes reject cross-site requests before contacting upstream services. Validation, upstream HTTP, rate-limit, timeout, unavailable-service, and malformed-response failures use the shared API error model. An absent, expired, or rejected token yields `unauthenticated`; the local auth cookie is then cleared. Optional token revocation failure never prevents local logout.

## Local development

Set `KADOCHI_AUTH_MODE=local` (the Docker Compose default), then use phone `09121234567` and OTP `1234`. No SMS is sent. Successful verification issues a seven-day HS256 JWT with issuer, audience, subject, phone, issued-at, and expiry claims. The signed JWT is stored only in the HttpOnly auth cookie and validated on current-user requests. The browser receives the same `Customer` shape used by the WordPress flow. Local mode is rejected whenever `NODE_ENV=production`, so it cannot act as a deployment fallback.

The local adapter sits behind the existing `startOtp`, `verifyOtp`, `getCurrentCustomer`, and `logout` interfaces. Switching to the MeliPayamak or WordPress-JWT adapter therefore requires configuration rather than changes to the login UI.

## Token handling and deployment

### MeliPayamak production mode

Set `KADOCHI_AUTH_MODE=melipayamak` and configure `KADOCHI_AUTH_SECRET`, `MELIPAYAMAK_OTP_URL`, `REDIS_URL`, `WOO_CONSUMER_KEY`, and `WOO_CONSUMER_SECRET`. `KADOCHI_AUTH_SECRET` must be at least 32 random characters and is used to sign the HttpOnly session JWT and HMAC the OTP before it is written to Redis.

The MeliPayamak relay contract matches v2: the BFF sends `POST { to: "0912…" }`; a successful response must provide the 4–6 digit OTP as a plain value or in a `code`, `otp`, `data`, or `result` field. The server never exposes that response or the code to the browser. It stores only a keyed digest for `OTP_CODE_TTL_SEC` (180 seconds by default), limits sends by phone and IP through `OTP_ATTEMPT_RATE_PER_HOUR` (3 by default), and limits verification attempts with `OTP_VERIFY_ATTEMPTS` (5 by default). A successful verification consumes the code, then resolves or creates the corresponding WooCommerce customer with the configured server-only REST credentials.

The resulting JWT contains only the customer ID and phone, is signed with `KADOCHI_AUTH_SECRET`, and is stored as `kadochi_auth_token` with `HttpOnly`, `SameSite=Lax`, `Secure` in production, and `Path=/`. Customer data is loaded from WooCommerce rather than read from the JWT claims.

### WordPress JWT mode

Set `KADOCHI_AUTH_MODE=wordpress-jwt`. `WORDPRESS_OTP_REQUEST_PATH` and `WORDPRESS_OTP_VERIFY_PATH` default to `/wp-json/kadochi/v1/auth/otp/start` and `/wp-json/kadochi/v1/auth/otp/verify`; each may be configured as a relative REST path. `WORDPRESS_OTP_REVOKE_PATH` is optional.

For this alternative mode, the deployed WordPress plugin/API must issue and rate-limit OTPs, exchange a valid OTP for `{ token: <JWT> }` with a future numeric `exp`, authenticate that JWT on `/wp-json/kadochi/v1/customer`, and optionally support revocation. This is intentionally an explicit WordPress deployment prerequisite: WordPress core's browser REST authentication is cookie-plus-nonce, while JWT authentication requires custom plugin support. See [WordPress REST API authentication](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/).

After WordPress-JWT verification, the BFF first confirms the returned JWT with WordPress's customer endpoint. It then stores the opaque token in `kadochi_auth_token` with the expiry taken from the required future numeric JWT `exp` claim.
