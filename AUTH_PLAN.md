# WordPress JWT Auth Feature Refactor

## Summary

Refactor the legacy auth domain into a self-contained auth vertical slice using the repository’s schema, service, and BFF conventions. Preserve phone OTP authentication, but make WordPress the identity authority and JWT issuer.

This plan is intentionally separate from the existing project-wide `PLAN.md`.

## Implementation Changes

- Expand `front/src/features/auth` with:
  - Zod schemas and inferred types for Iranian phone numbers, OTP requests, verification, WordPress JWT responses, customers, and auth state.
  - Iranian numbers accepted as `09…`, `0098…`, or `+98…` and normalized to `+989…`.
  - Browser services: `startOtp`, `verifyOtp`, `getCurrentCustomer`, and `logout`.
  - Server-only WordPress services for OTP request, OTP verification, bearer-authenticated customer lookup, and JWT-cookie management.
  - `AuthProvider`, `useAuth`, and `useOptionalAuth` with authenticated/loading/anonymous/error states, refresh support, and cross-tab login/logout synchronization.
  - An updated `CONTRACT.md` describing endpoints, authentication, caching, errors, token handling, and deployment prerequisites.

- Add auth-only BFF routes:
  - `POST /api/auth/otp/start`: validate/normalize the phone, enforce same-origin checks, and forward to WordPress.
  - `POST /api/auth/otp/verify`: verify OTP upstream, validate the returned JWT through `GET /wp-json/kadochi/v1/customer`, store it in an HttpOnly cookie, and return only the normalized customer.
  - `GET /api/auth/current`: read the JWT cookie, forward it as `Authorization: Bearer`, and return the current customer.
  - `POST /api/auth/logout`: optionally revoke upstream when supported, always clear the local cookie, and return `204`.
  - All routes use `no-store`, request IDs, existing safe error normalization, and no automatic retries.

- Store the WordPress JWT as `kadochi_auth_token` with `HttpOnly`, `SameSite=Lax`, `Secure` in production, root path, and expiration matching the JWT `exp` claim. Never expose or trust JWT claims as customer data in browser code; WordPress validates the token on every identity lookup. Expired or rejected tokens are cleared and require a new OTP login.

- Add validated server configuration for configurable WordPress OTP-request and OTP-verify REST paths. Deployment must provide a WordPress authentication plugin/API that:
  - Sends and rate-limits OTP challenges.
  - Exchanges a valid OTP for a JWT containing a future numeric `exp`.
  - Accepts that JWT as bearer authentication for the existing `/wp-json/kadochi/v1/customer` route.
  - Optionally exposes token revocation; refresh tokens are not required.

WordPress core documents cookie-plus-nonce authentication as its native browser REST mechanism and custom authentication plugins for other methods, so JWT support remains an explicit deployment prerequisite rather than being simulated in Next.js. [WordPress REST authentication documentation](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)

## Public Interfaces

- `startOtp({ phone }) → { expiresIn, retryAfter? }`
- `verifyOtp({ phone, code }) → Customer`
- `getCurrentCustomer() → Customer`
- `logout() → void`
- Auth context exposes `customer`, `status`, `error`, `startOtp`, `verifyOtp`, `refresh`, and `logout`.
- OTP codes accept 4–6 digits. WordPress remains responsible for code generation, storage, attempt limits, consumption, and expiry.

## Test Plan

- Validate all supported Iranian phone formats and reject malformed/non-Iranian mobile numbers.
- Verify malformed OTP inputs never reach WordPress.
- Confirm upstream validation, rate-limit, timeout, malformed-response, and authentication errors use the existing safe error model.
- Confirm successful verification stores the JWT only in the HttpOnly cookie and returns no token to the browser.
- Confirm invalid, expired, or WordPress-rejected JWTs produce an unauthenticated state and clear the cookie.
- Confirm logout clears the cookie even if optional upstream revocation fails.
- Confirm cross-site auth mutations are rejected.
- Confirm provider refresh, login/logout state changes, and cross-tab synchronization.
- Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`, followed by route smoke tests against the configured WordPress OTP/JWT service.

## Assumptions and Boundaries

- Changes may touch `features/auth`, `/app/api/auth/**`, and auth-specific environment validation only.
- No provider is mounted in the application, and no UI, layout, middleware, or other feature is wired to auth.
- Existing cart, checkout, and occasion authentication behavior is unchanged; propagating JWT authorization into those domains is a separate task.
- No WordPress plugin implementation is added in this refactor.
- No local Next.js JWT secret, fallback unsigned session, browser storage token, or WooCommerce administrator credential is introduced.
- Because no test runner currently exists, this refactor will not add a new testing dependency solely for auth; static checks, build verification, and route-level smoke scenarios are required.
