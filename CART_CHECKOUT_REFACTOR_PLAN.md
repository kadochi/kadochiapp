# Cart and Checkout Refactor

## Summary

- Port the complete legacy experience: cart, three-step checkout, Tehran delivery slots, packaging, postcard message, Woo payment, and branded result pages.
- Require authentication before checkout and associate orders with the JWT-authenticated Woo customer.
- Keep WooCommerce authoritative for cart contents, stock, shipping, tax, totals, order creation, and Zarinpal payment. Do not port the legacy localStorage cart, browser-calculated totals, privileged Woo v3 calls, or direct Zarinpal callback code.
- Build all presentation with Tailwind v4 tokens and the current `Button`, `Input`, `TextArea`, `Checkbox`, `RadioGroup`, `InputStepper`, `ProgressStepper`, `Divider`, `Alert`, `StateMessage`, `Price`, and `SumPrice` variants; add no CSS modules.

## Implementation Changes

### Cart and commerce UI

- Add thin `/basket`, `/checkout`, `/checkout/return`, `/checkout/success`, and `/checkout/failure` routes backed by feature components under the existing `features/cart` and `features/checkout` boundaries.
- Render personalized cart state server-side, then manage quantity/remove mutations in a leaf client hook using full cart snapshots returned by the BFF. Respect Woo quantity limits and disable only the pending item.
- Preserve the legacy narrow RTL layout, product thumbnail/list, empty state, sticky summary bar, and internal header. Use authoritative Woo totals converted through one shared IRR-to-Toman formatter.
- Split checkout into three focused step components:
  1. Sender and recipient details, with authenticated phone/email prefilled and recipient first/last names collected separately.
  2. Delivery slot, Woo shipping rate when multiple are available, gift/normal packaging, and optional postcard text.
  3. Fixed online Zarinpal method and final Woo totals.
- Redirect anonymous users to `/login?next=/checkout`; enforce the same requirement again in checkout BFF handlers.

### API, auth, and data contracts

- Correct the existing cart Store API schema: consume `images[]`, `quantity_limits`, line/totals, discounts, fees, shipping state, payment method IDs, and Kadochi extensions. Correct add-item variation payload handling.
- Extend `Customer` with `firstName`, `lastName`, and canonical `phone`; populate these from Woo customer metadata in Kadochi Core.
- Define `CheckoutState` as `{ cart, customer, deliverySlots, packagingOptions, paymentMethod }`. The only supported payment method is configurable with `KADOCHI_PAYMENT_METHOD_ID`, defaulting to the official ZarinPal plugin ID `WC_ZPal`; checkout fails closed if that ID is unavailable.
- Define checkout submission as sender names, a discriminated self/other recipient, address, delivery slot ID, packaging ID, postcard text, and operation UUID. Derive sender phone/email, gateway ID, country `IR`, and city `تهران` server-side.
- Forward both the HttpOnly Cart Token and authenticated bearer token to checkout so the existing guest cart becomes an order belonging to the signed-in customer. Rotate returned cart tokens without exposing them to browser code.
- Replace the incorrect payment-method parsing from `GET /checkout`: Woo exposes checkout draft data there, while payment method IDs and cart totals come from the cart response. Cart writes and checkout remain Cart-Token protected. [Woo Cart API](https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/cart/), [Woo Checkout API](https://developer.woocommerce.com/docs/apis/store-api/resources-endpoints/checkout/), [Cart Token contract](https://developer.woocommerce.com/docs/apis/store-api/cart-tokens/).

### WordPress checkout integration

- Extend Kadochi Core’s Store API data with a validated `fastDelivery` cart-item flag. Recognize the canonical `fast-delivery` tag plus the legacy aliases already used by the old flow.
- Register delivery slot, packaging, postcard, and operation ID using Woo’s Additional Checkout Fields API so Woo persists them on the order. Sanitize and validate them again in WordPress. [Woo additional checkout fields](https://developer.woocommerce.com/docs/block-development/extensible-blocks/cart-and-checkout-blocks/additional-checkout-fields/).
- Generate delivery slots using `Asia/Tehran`: 10–13, 13–16, and 16–19; skip Fridays; return the first nine valid slots; start today only when every cart item is fast-delivery eligible. Recompute on submission and reject stale or forged slots.
- Use Woo-selected shipping rates and Woo totals. Remove the legacy hardcoded 89,000-Toman shipping charge and browser-calculated 10% tax. Gift packaging remains the default and both packaging choices remain zero-fee unless Woo later supplies a configured fee.
- Add an authenticated owner-only customer-order summary endpoint. It returns safe order ID, paid/status state, creation date, total, recipient, and delivery slot; another customer’s order returns not-found.
- Let the Woo Zarinpal gateway own payment request, verification, and order status. Kadochi Core rewrites the verified order-received destination to `/checkout/return?order=…`; that route checks the protected order summary and branches to the branded success or failure page. No Next.js Zarinpal secrets or `/zp-callback` implementation.
- Record the checkout draft/order and operation UUID before processing. Prevent concurrent submission and never retry payment automatically. After a timeout, reconcile against the protected order summary and report paid, unpaid, or unknown instead of blindly creating another attempt.
- Add `KADOCHI_PAYMENT_METHOD_ID=WC_ZPal` and `KADOCHI_FRONTEND_URL` to validated environment configuration and Docker propagation. Validate Woo, shipping, gateway, and callback behavior in every target environment.

## Public Interface Changes

- `Customer`: adds `firstName`, `lastName`, and `phone`.
- `Cart`: adds quantity limits, complete totals, shipping/calculation flags, payment method IDs, and per-item fast-delivery eligibility.
- `CheckoutState`: replaces the current invalid payment-method response with the complete authenticated UI state.
- `SubmitCheckoutInput`: becomes the Kadochi domain payload; browser callers cannot choose totals, customer identity, country, city, or gateway ID.
- Add an owner-scoped order-summary contract used only for payment reconciliation and result rendering.
- Update cart, checkout, auth, and integration contract documents to match these behaviors.

## Test Plan and Assumptions

- Unit-test money conversion, real Woo cart fixture mapping, quantity limits, delivery cutoffs/Fridays/fast eligibility, checkout schemas, and stale-slot rejection.
- Verify cart empty/loading/error states, quantity/remove failures, auth redirect and return, all checkout validation states, multiple shipping rates, unavailable Zarinpal, and responsive RTL layouts.
- Run Docker contract tests for Cart-Token rotation, bearer-associated customer orders, additional-field persistence, cross-customer order denial, authoritative totals, and cart state after checkout.
- Run Zarinpal sandbox scenarios for success, cancellation, gateway failure, duplicate clicks, timeout reconciliation, and branded return routing before enabling checkout.
- Finish with PHP syntax checks, `npm run lint`, tests, and `npm run build`.
- Profile/order-history pages remain outside this refactor; the success-page primary action returns to `/products`.
- The existing package images for empty, success, failure, normal packaging, and gift packaging are reused. No new visual assets or dependencies are required.
