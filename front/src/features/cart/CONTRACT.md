# Cart contract

All cart methods use their explicit `/api/cart…` same-origin BFF action, validate input/output, use `no-store`, and never retry mutations. The BFF accepts and rotates Woo Store API cart tokens only in an HttpOnly cookie; it forwards no generic upstream path or headers.

`Cart` is a mapped snapshot of Woo's Store API response. It includes each item's server-supplied quantity limits, line totals, image array's first image, fast-delivery eligibility, all cart totals, shipping calculation state/rates, and the available payment method IDs. The browser never calculates tax, shipping, discounts, stock limits, or totals.

`addItem` sends Woo's supported `{ id, quantity, variation: [{ attribute, value }] }` shape. It deliberately does not accept a variation ID in the `variation` field.

The cart cross-sell rail resolves the merchant-configured WooCommerce cross-sell relationships for the current non-cross-sell cart products, returning at most five available products. Products added from that rail are flagged through Woo's Store API cart-item data: they contribute to authoritative cart totals and checkout, but render only in the rail (where the delete action removes the flagged line).
