# Cart contract

All cart methods use their explicit `/api/cart…` same-origin BFF action, validate input/output, and use `no-store`. Mutations are not retried except coupon removal: after a retryable upstream failure, the BFF reads the cart to determine whether removal already succeeded and retries at most once if the coupon remains. If the browser loses the BFF response, it also reads the cart before reporting removal as failed. The BFF accepts and rotates Woo Store API cart tokens only in an HttpOnly cookie; it forwards no generic upstream path or headers.

`Cart` is a mapped snapshot of Woo's Store API response. It includes each item's server-supplied quantity limits, line totals, image array's first image, fast-delivery eligibility, all cart totals, shipping calculation state/rates, and the available payment method IDs. The browser never calculates tax, shipping, discounts, stock limits, or totals.

Core Woo coupons discount eligible product lines before Woo calculates tax, so tax can decrease with the taxable product amount. A full product discount can leave product tax at zero. Shipping remains separately calculated unless a configured free-shipping rule or coupon enables a free-shipping method; Kadochi's delivery-slot price does not replace such a method's zero cost.

`addItem` sends Woo's supported `{ id, quantity, variation: [{ attribute, value }] }` shape. It deliberately does not accept a variation ID in the `variation` field.

The cart cross-sell rail resolves the merchant-configured WooCommerce cross-sell relationships for the current non-cross-sell cart products, returning at most five available products. Products added from that rail are flagged through Woo's Store API cart-item data: they contribute to authoritative cart totals and checkout, but render only in the rail (where the delete action removes the flagged line).
