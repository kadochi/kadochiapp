# Simplified WordPress-Owned OTP/JWT Authentication

## Summary

Use one authentication path in every environment:

1. Next.js sends the phone number to WordPress.
2. WordPress sends the OTP through the existing MeliPayamak relay, or accepts the fixed local-development OTP.
3. WordPress verifies the OTP, resolves or creates the customer, and issues the JWT.
4. Next.js stores the opaque JWT in an HttpOnly cookie and forwards it as bearer authorization to protected WordPress APIs.

WordPress owns remote authentication through its plugin and permission callbacks; Next.js acts only as a BFF and cookie boundary. See the [WordPress REST authentication guidance](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/), [Next.js BFF guidance](https://nextjs.org/docs/app/guides/backend-for-frontend), and [Next.js cookie API](https://nextjs.org/docs/app/api-reference/functions/cookies).

## API and Implementation Changes

- Add WordPress-owned endpoints to `kadochi-core`:
  - `POST /wp-json/kadochi/v1/auth/otp/start`
    - Input: `{ phone }`
    - Output: `{ expiresIn, retryAfter, codeLength }`
  - `POST /wp-json/kadochi/v1/auth/otp/verify`
    - Input: `{ phone, code }`
    - Output to Next.js only: `{ token, expiresIn, customer }`
  - Keep `GET /wp-json/kadochi/v1/customer` as the authenticated identity endpoint.
  - Register route arguments and permission callbacks using WordPress REST validation conventions.

- Make WordPress the only OTP and JWT authority:
  - In `local` or `development`, accept `09121234567` with OTP `1234`; never allow the bypass in staging or production.
  - In production, call the existing MeliPayamak relay with `{ "to": "0912…" }` and require `{ "code": "<4–6 digits>" }`.
  - Store only an HMAC digest in a WordPress transient for 180 seconds, enforce a 60-second resend cooldown and five verification attempts, and consume the challenge after success.
  - Resolve users by canonical phone metadata, legacy WooCommerce billing phone, or phone-based username. Create a WooCommerce customer when none exists, then persist canonical `+989…` and billing `09…` values.
  - Issue a seven-day HS256 JWT signed with the WordPress authentication salt, containing validated `iss`, `aud`, `sub`, `phone`, `iat`, and `exp` claims.
  - Authenticate bearer tokens through WordPress’s current-user authentication hook and use `current_user_can( 'read' )` in protected route permission callbacks.

- Reduce Next.js auth to a thin proxy:
  - Remove local JWT creation/verification, MeliPayamak handling, Redis logic, WooCommerce administrator requests, multiple auth adapters, optional revocation, and configurable OTP route paths.
  - `otp/start` and `otp/verify` always call the fixed WordPress endpoints.
  - On verification, return only `Customer` to browser code and set `kadochi_auth_token` with `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/`, and the WordPress-provided lifetime.
  - `current` reads the cookie and calls WordPress with `Authorization: Bearer <JWT>`; clear the cookie after a 401.
  - `logout` only clears the Next.js cookie and returns `204`.
  - Preserve same-origin checks, `Cache-Control: no-store`, request IDs, schema validation, and safe error responses.

- Authorize protected application APIs:
  - Add one shared server helper that reads the JWT cookie and produces the WordPress bearer header.
  - Update occasion requests to use this helper instead of forwarding browser cookies.
  - Leave WooCommerce guest cart and checkout `Cart-Token` behavior unchanged.

- Remove obsolete infrastructure and configuration:
  - Delete the dedicated MeliPayamak Next.js service and Redis helper.
  - Remove `ioredis`, the Redis Compose service/volume, WooCommerce REST credentials, Next.js JWT secrets, OTP tuning variables, auth modes, and revoke/path variables.
  - Pass only `WP_ENVIRONMENT_TYPE` and `MELIPAYAMAK_OTP_URL` to WordPress.
  - Preserve all rendered login components and their current UI/UX; only simplify the server-side development-prefill condition.
  - Update the auth contract, README, environment example, Compose configuration, and stale integration guidance.

## Test Plan

- Run TypeScript checking, ESLint, Next.js production build, Compose validation, and PHP syntax checks inside the WordPress container.
- Confirm local OTP start performs no SMS request, rejects other credentials, and valid credentials create or resolve a real WordPress customer.
- Confirm successful verification sets an HttpOnly cookie while the browser response contains no JWT.
- Reject malformed phones/codes, expired or over-attempted OTPs, premature resends, malformed relay responses, and unavailable providers.
- Reject tampered JWTs and tokens with invalid signatures, algorithms, issuer, audience, subject, or expiry.
- Confirm `current` and every occasion operation succeed with the JWT and enforce customer ownership; missing, expired, or tampered tokens return 401.
- Confirm logout deletes the cookie and subsequent protected requests fail.
- Confirm cross-site auth mutations remain rejected and guest cart/checkout behavior is unchanged.

## Assumptions

- The existing MeliPayamak relay is retained and standardized on a `{ code }` response rather than integrating direct account credentials.
- A verified unknown phone automatically creates a WooCommerce customer, matching the existing “login/register” UX.
- JWT authorization covers current-customer and occasion APIs; cart and checkout remain separate guest-token flows.
- WooCommerce is active in environments where production customer creation is required.
- No refresh tokens, token database, revocation list, middleware/proxy authorization layer, browser token storage, Redis, or additional authentication modes are introduced.
- Existing uncommitted UI changes are preserved; only the over-engineered auth/API additions are replaced.
