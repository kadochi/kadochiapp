# Checkout contract

`getCheckoutState` and `submitCheckout` use `/api/checkout` and Woo Store API only, always `no-store`. Checkout is off unless `KADOCHI_CHECKOUT_ENABLED=true` after payment gateways, shipping, tax, guest/customer policy, and timeout reconciliation are verified. Submissions are never retried and include a caller-generated operation ID; the selected gateway must be checked for idempotency support before enabling it.
