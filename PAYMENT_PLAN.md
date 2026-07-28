# Wire Initial Payment Through the Working Gateway API

## Summary

Keep WooCommerce Store API responsible for validating the cart and creating the order, but stop relying on its response to start ZarinPal. The pinned ZarinPal 5.1.1 plugin's `process_payment()` only returns an intermediate WooCommerce order-pay URL; its `Send_to_ZarinPal_Gateway()` method performs the real bank API request. The existing authenticated retry endpoint already invokes that working method.

## Implementation Changes

- Reuse the existing server-side `retryProfileOrderPayment()` gateway client from the initial checkout flow, including its manual 302 handling and ZarinPal hostname validation.
- After Store API order creation:
  - If the response contains an order ID and an actual trusted ZarinPal redirect, return it directly.
  - Otherwise, for `WC_ZPal`, invoke `/wp-json/kadochi/v1/profile/orders/{id}/retry-payment` immediately and return its bank redirect as the initial checkout result.
- When Store API returns the observed HTTP 400 after creating the order:
  - Resolve the owner's order through the checkout operation UUID.
  - If already paid, return the paid reconciliation result.
  - If unpaid, invoke the same working payment-start endpoint and return its redirect.
  - If no order exists, preserve the safe validation or gateway error instead of attempting payment.
- Keep transport timeouts ambiguous: reconcile them without automatically issuing another authority request.
- Retain the persisted-operation metadata fix as defensive checkout handling.
- Rename gateway lifecycle logging from retry-specific wording to payment-start wording so both initial and retry attempts are accurately observable.

## Interfaces

- No browser API or checkout result schema changes.
- `/api/checkout` continues returning `paymentResult.redirectUrl`.
- The existing owner-protected WordPress `/profile/orders/{id}/retry-payment` route remains the single gateway-start integration point.
- No database migration or deployment configuration change.

## Test Plan

- Store API returns an order-pay URL -> gateway-start endpoint returns a ZarinPal 302 -> initial checkout returns the bank URL.
- Store API returns HTTP 400 but operation lookup finds an unpaid order -> gateway-start endpoint is called and the first attempt navigates to ZarinPal.
- Store API returns a direct trusted ZarinPal URL -> no second authority is created.
- Operation lookup finds a paid order -> return paid reconciliation without starting payment.
- HTTP 400 with no materialized order -> return a safe checkout error and do not call the gateway.
- Gateway endpoint rejects a paid, foreign, expired, or mismatched order -> preserve its safe error.
- Network timeout after payment submission -> reconcile without an automatic second gateway call.
- Run PHP syntax validation, checkout/profile unit tests, full frontend tests, and production smoke verification. Expected production sequence: Store API checkout -> optional operation lookup -> authenticated `retry-payment` POST -> 302 to `payment.zarinpal.com`, without visiting the failure page.

## Assumptions

- Production uses the repository-pinned [ZarinPal 5.1.1 package](https://downloads.wordpress.org/plugin/zarinpal-woocommerce-payment-gateway.5.1.1.zip).
- The existing retry endpoint remains successful and correctly configured with the production merchant credentials.
- Checkout operation UUIDs remain the authoritative link between a failed Store API response and its newly created order.
