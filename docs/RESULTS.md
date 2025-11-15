### Summary

This document captures the implemented fixes and UX improvements based on the issues outlined in the PR report. The work focuses on comment reliability on Vercel, payment success navigation, filter performance/UX signaling, clearer checkout errors, and orders list freshness.

### Implemented Changes

- Comments on Vercel

  - Route product reviews via internal WP proxy first, falling back to direct Woo credentials only if necessary.
  - Ensures proper auth, retries, and server-side execution compatible with Vercel.

- Payment success navigation

  - Persist `orderId` in a short‑lived cookie before redirecting to the gateway.
  - Read cookie fallback in Zarinpal callback in addition to `sessionStorage` and query to ensure `/checkout/success` receives `order` reliably.

- Filters performance/UX

  - Wrap filter URL changes in a React `startTransition` to trigger `loading.tsx` skeletons consistently.
  - Add `aria-busy` on the filter bar for accessible feedback while pending.

- Checkout error clarity

  - Map known API errors (e.g., `invalid_amount`, `missing_merchant_id`, `invalid_callback_url`, network/timeout) to specific, user-friendly messages.

- Orders freshness in profile
  - Refetch orders on window focus and when the page becomes visible to surface recently placed orders without manual refresh.

### Files Edited

- `src/app/api/review/route.ts`
  - Add proxy-first review posting (`/api/wp/wp-json/wc/v3/products/reviews`) with fallback to direct Woo API.
- `src/app/(front)/checkout/CheckoutClient.tsx`
  - Set `kadochi_order_id` cookie; improve error messages for payment initiation.
- `src/app/(front)/checkout/zp-callback/page.tsx`
  - Read `kadochi_order_id` cookie as an additional fallback to build the success URL.
- `src/app/(front)/products/sheets/FiltersBar.client.tsx`
  - Use `useTransition` for URL updates and add `aria-busy` during pending transitions.
- `src/app/(front)/profile/orders/OrdersPageClient.tsx`
  - Refetch page 1 on focus/visibility to keep the list up to date.

### How to Verify

- Comments
  1. Authenticate and submit a product review on Vercel. 2) Confirm 200 OK and review presence in Woo/WordPress. 3) Check Vercel logs for proxy route calls.
- Payment success
  1. Complete a checkout flow to redirect to Zarinpal. 2) After payment, ensure callback lands on `/checkout/success?order={id}&paid=...` even if sessionStorage is cleared. 3) Verify orders detail page loads from success link.
- Filters
  1. Navigate to `/products`. 2) Apply/clear filters from the bar and sheets. 3) Observe skeleton loading state appears immediately during transitions.
- Checkout errors
  1. Temporarily misconfigure env or simulate network failure. 2) Attempt payment initiation. 3) Confirm user-friendly error messages appear instead of generic text.
- Orders freshness
  1. Place a new order. 2) Open `Profile → My Orders`. 3) Toggle app focus or navigate away and back; verify the latest order appears without full reload.

### Follow-ups

- Ensure required env vars are present on Vercel (`WP_BASE_URL`, `WP_APP_USER`, `WP_APP_PASS`, Woo keys if fallback is needed).
- Consider adding structured logging/correlation IDs for payment initiation → callback → success.
- Add automated tests for: review submission, callback to success navigation, filter transitions showing skeletons, and orders refetch on focus.
