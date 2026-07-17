# Checkout contract

`getCheckoutState` and `submitCheckout` use `/api/checkout` and Woo Store API only, always `no-store`. Checkout is off unless `KADOCHI_CHECKOUT_ENABLED=true` after payment gateways, shipping, tax, guest/customer policy, and timeout reconciliation are verified. Submissions are never retried and include a caller-generated operation ID; the selected gateway must be checked for idempotency support before enabling it.

Checkout BFF handlers require a valid HttpOnly auth token and forward it with the HttpOnly Cart Token. The current cart is therefore converted into an order for the authenticated Woo customer. `CheckoutState` is `{ cart, customer, deliverySlots, packagingOptions, paymentMethod }`; its single payment method is `KADOCHI_PAYMENT_METHOD_ID` (default `zarinpal`) and checkout fails closed when that ID is absent from `cart.payment_methods`.

Browser checkout input contains sender/recipient/address/delivery/packaging/postcard/operation data only. The BFF derives the sender's phone and email and fixed `IR`/`تهران` values, persists validated additional checkout fields to the Woo draft, then processes payment. A timeout is reconciled via the owner-scoped operation summary and never triggers an automatic retry.
