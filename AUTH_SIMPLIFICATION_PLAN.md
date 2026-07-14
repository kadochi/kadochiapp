# Simplified WordPress-Owned OTP/JWT Authentication

## Summary

Use one authentication path in every environment:

1. Next.js sends the phone number to WordPress.
2. WordPress sends the OTP through the existing MeliPayamak relay, or accepts the fixed local-development OTP.
3. WordPress verifies the OTP, resolves or creates the customer, and issues the JWT.
4. Next.js stores the opaque JWT in an HttpOnly cookie and forwards it as bearer authorization to protected WordPress APIs.

WordPress owns remote authentication through its plugin and permission callbacks; Next.js acts only as a BFF and cookie boundary. See the [WordPress REST authentication guidance](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/), [Next.js BFF guidance](https://nextjs.org/docs/app/guides/backend-for-frontend), and [Next.js cookie API](https://nextjs.org/docs/app/api-reference/functions/cookies).

## Decision: WordPress owns OTP and JWT, not Next.js

Considered keeping OTP issuance and verification in Next.js (the current `melipayamak` adapter). Rejected for these reasons:

1. **WordPress must authenticate the request anyway.** Every protected `kadochi/v1` route (`/customer`, `/occasions`) resolves identity with `is_user_logged_in()` / `get_current_user_id()`. A Next.js-issued JWT is meaningless to WordPress: today the occasions proxy forwards browser cookies (`occasions.server.ts`), which never authenticate a headless visitor, so those routes return 401 in `local` and `melipayamak` modes. Making a Next.js token work would require WordPress to verify it — meaning WordPress implements JWT verification regardless — so issuing it anywhere other than WordPress only duplicates the authority.
2. **The Next.js-side flow needs store-admin credentials.** The `melipayamak` adapter resolves/creates customers through the WooCommerce REST API with `WOO_CONSUMER_KEY`/`WOO_CONSUMER_SECRET`, placing admin-scope credentials in the Node app and re-implementing ownership logic WordPress already enforces via `post_author` and capabilities. WordPress-side verification uses `wp_insert_user`/`wc_create_new_customer` directly — no privileged HTTP credentials exist anywhere.
3. **Redis exists only for OTP state.** A 180-second HMAC digest and a handful of counters fit WordPress transients; moving verification to WordPress deletes `ioredis`, the Redis container, and its volume.
4. **This is the established headless pattern.** WordPress JWT plugins ([JWT Authentication for WP REST API](https://wordpress.org/plugins/jwt-authentication-for-wp-rest-api/), [Simple JWT Login](https://simplejwtlogin.com/blog/headless-wordpress-jwt-authentication), [headless WooCommerce guidance](https://thewpclan.com/headless-woocommerce-authentication/)) all issue the token in WordPress, authenticate through the `determine_current_user` filter, and default to a seven-day expiry; the [BFF pattern](https://www.devgould.com/jwt-authentication-with-nextjs-bff-backend-for-frontend/) keeps the token in an HttpOnly cookie so the browser never sees it — exactly the split this plan adopts.

What Next.js would have offered — TypeScript ergonomics, edge-side rate limiting — does not outweigh the duplicated authority; coarse per-phone/per-IP limits work in WordPress transients, and the BFF still contributes same-origin checks, schema validation, and the cookie boundary.

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
  - Store only an HMAC digest in a WordPress transient for 180 seconds, enforce a 60-second resend cooldown, five verification attempts, and hourly per-phone and per-hashed-IP send caps in transients, and consume the challenge after success. DB-backed transients are sufficient; no object cache is required.
  - Resolve users by canonical phone metadata, legacy WooCommerce billing phone, or phone-based username. Create a WooCommerce customer when none exists (`wc_create_new_customer`, no REST credentials), then persist canonical `+989…` and billing `09…` values.
  - Issue a seven-day HS256 JWT containing validated `iss`, `aud`, `sub` (numeric WordPress user ID), `phone`, `iat`, and `exp` claims. Sign with a domain-separated key derived from the WordPress authentication salt, e.g. `hash_hmac( 'sha256', 'kadochi-jwt-v1', wp_salt( 'auth' ) )` — zero extra configuration; rotating salts invalidates every session, which is acceptable (and useful for emergency logout). The Docker deployment keeps salts stable; if the site ever moves to a host that rotates salts, switch to a dedicated `KADOCHI_JWT_SECRET` constant, the convention used by standard JWT plugins.
  - Authenticate bearer tokens through the `determine_current_user` filter (returning the user ID or `null`), surface malformed-token failures through `rest_authentication_errors`, and use `current_user_can( 'read' )` in protected route permission callbacks.

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
- Confirm `current` and every occasion operation succeed with the JWT and enforce customer ownership; missing, expired, or tampered tokens return 401. (Occasion routes previously forwarded browser cookies and always failed WordPress authentication — this is a fix, not just a refactor.)
- Confirm per-phone and per-IP send caps reject excess OTP starts and reset after their window.
- Confirm logout deletes the cookie and subsequent protected requests fail.
- Confirm cross-site auth mutations remain rejected and guest cart/checkout behavior is unchanged.

## Assumptions

- The existing MeliPayamak relay is retained and standardized on a `{ code }` response rather than integrating direct account credentials.
- A verified unknown phone automatically creates a WooCommerce customer, matching the existing “login/register” UX.
- JWT authorization covers current-customer and occasion APIs; cart and checkout remain separate guest-token flows.
- WooCommerce is active in environments where production customer creation is required.
- No refresh tokens, token database, revocation list, middleware/proxy authorization layer, browser token storage, Redis, or additional authentication modes are introduced.
- Existing uncommitted UI changes are preserved; only the over-engineered auth/API additions are replaced.
