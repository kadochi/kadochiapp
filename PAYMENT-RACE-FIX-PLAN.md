# Stabilize Order Submission and Payment Handoff

## Summary

- The audit confirmed a timeout race: the pinned [ZarinPal 5.1.1 plugin](https://downloads.wordpress.org/plugin/zarinpal-woocommerce-payment-gateway.5.1.1.zip) allows its authority request 15 seconds, while Next.js aborts every WordPress request after 8 seconds.
- A second race releases the checkout submission lock immediately after navigation begins, briefly permitting duplicate submissions.
- Apply the OTP pattern of ordered timeouts and retry-safe recovery, plus the sign-up/payment-retry pattern of hard navigation with the client lock held through page unload.

## Implementation Changes

- Give only the ZarinPal payment-start request a 25-second WordPress timeout, leaving the shared 8-second default unchanged.
- Use the checkout operation UUID as the initial payment-attempt ID. Explicit failure/profile retries generate and retain a new UUID for that attempt.
- Send `attemptId` through the BFF to the owner-protected WordPress retry-payment endpoint.
- Make payment start idempotent in WordPress:
  - Acquire an atomic, non-autoloaded per-order lock containing the attempt ID, starting authority, and timestamp.
  - Repeating the same attempt returns the authority created by the original call instead of contacting ZarinPal again.
  - An attempt still running returns a retryable `payment_in_progress` error with `retryAfter`.
  - Release the lock on a definite gateway failure; expire an abandoned lock after 60 seconds.
  - Validate all recovered redirects against the production/sandbox ZarinPal hosts and never expose or log the authority separately.
- After an ambiguous timeout, retry only the recovery lookup with the same attempt ID. If no paid state or recoverable redirect exists, return `reconciliation: "unknown"`—never classify a transport timeout as an unpaid failure.
- Keep the checkout submission lock held for external/internal navigation and unknown outcomes; release it only for a definite, safely retryable failure.
- Use full-page navigation for terminal checkout results so cookies and server-rendered state are refreshed. Preserve `window.location.assign` for ZarinPal and use `window.location.replace` for local success/failure routes.
- Add correlated, sanitized timing logs for payment start, in-progress detection, authority recovery, timeout, and definitive rejection.

## Interfaces

- `/api/checkout` keeps its existing request and response schemas; its existing `operationId` becomes the initial payment-attempt ID.
- `/api/profile/orders/{orderId}/retry-payment` accepts `{ attemptId: UUID }`.
- Add `payment_in_progress` and optional `retryAfter` to the shared safe error contract.
- No database migration is required; synchronization state is stored as bounded per-order WordPress metadata/options.

## Test Plan

- A gateway response taking nearly 15 seconds succeeds within the 25-second outer deadline.
- A lost response after authority creation is recovered with the same redirect and exactly one ZarinPal authority request.
- Concurrent duplicate submissions return `payment_in_progress` and never invoke the gateway twice.
- A stale 60-second lock without an authority can be retried safely.
- Store API timeouts reconcile paid orders, recover available redirects, and otherwise return `unknown`, never `unpaid`.
- Double-clicks and slow navigation produce one checkout request and keep the button locked.
- Definitive validation/gateway failures unlock the UI and retain actionable error messaging.
- Run checkout/profile unit tests, the full frontend test and lint suites, PHP syntax validation, and a production smoke test with correlated Next.js, WordPress, and WooCommerce logs.

## Assumptions

- Production remains pinned to ZarinPal 5.1.1 and gateway ID `WC_ZPal`.
- WordPress and Next.js are deployed together so the coordinated `attemptId` contract is available at rollout.
- Unknown payment state must favor duplicate-payment prevention over automatically creating another authority.
