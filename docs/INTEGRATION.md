# Kadochi integration runbook

## Baseline status

The local Docker stack was stopped while this change was implemented, so no running WordPress/WooCommerce/SCF version, route, record, or session fixture was available to snapshot. Do not enable this plugin in a production-like installation before recording the following in the deployment ticket:

- WordPress, WooCommerce, and SCF versions; active plugins; registered custom types/routes; and representative API responses.
- Counts/statuses/authors and SCF metadata for `slider`, `banner`, `gifts`, `hero`, and `occasion`.
- Existing consumers of the legacy custom-post REST routes.
- The customer identity provider, WordPress cookie/nonce bridge, guest policy, gateways, shipping, tax, coupons, and occasion retention policy.

The selected retention behavior in this implementation is WordPress trash (not permanent deletion). No administrator support override exists for customer occasions: even administrators use their own ownership scope through the customer API.

## Installation and migration

1. Start the stack, install/activate a compatible Secure Custom Fields release and WooCommerce, then activate **Kadochi Core** under Plugins. The Docker compose file mounts it at `wp-content/plugins/kadochi-core`.
2. Confirm the `kadochi/v1/health` response as an administrator. Resolve any SCF notice before publishing content.
3. Snapshot representative records before activation. Existing post-type registrations are adopted rather than re-registered; the plugin only registers missing types. Existing `occasion` registrations are force-hardened: no public/query/search/rewrite/default REST access remains.
4. Confirm the normalized public route at `GET /wp-json/kadochi/v1/content/home`. Keep existing editorial REST routes during the compatibility audit; do not disable them until their consumers have migrated.
5. Set `WP_ENVIRONMENT_TYPE=production` and `MELIPAYAMAK_OTP_URL` before production testing. Kadochi Core owns OTP verification and bearer JWT authentication; the BFF keeps the opaque token in an HttpOnly cookie and forwards it only to protected WordPress routes.
6. The Docker image provisions the official ZarinPal for WooCommerce plugin (gateway ID `WC_ZPal`). Activate it and configure its merchant credentials in WooCommerce, then set `KADOCHI_FRONTEND_URL` to the public Next.js origin. If using another gateway, set `KADOCHI_PAYMENT_METHOD_ID` to its exact case-sensitive Woo ID in both services. Verify gateway, shipping, tax, bearer-associated customer orders, additional-field persistence, duplicate-payment, and timeout reconciliation behavior.

## Rollback

Deactivate Kadochi Core to remove its custom REST routes and registrations, then flush rewrite rules. Records and SCF post metadata are not deleted. Restore the pre-activation database snapshot to revert visibility/capability changes for an imported `occasion` type. Do not remove or rename field/group keys without a separately tested data migration.

## Contracts

- `GET /wp-json/kadochi/v1/content/home`: normalized editorial DTO, public, cacheable.
- `POST /wp-json/kadochi/v1/auth/otp/start` and `POST /wp-json/kadochi/v1/auth/otp/verify`: WordPress-owned OTP challenge and JWT issuance. The verification response is consumed only by the BFF.
- `GET /wp-json/kadochi/v1/customer`: current customer only, authenticated.
- `GET /wp-json/kadochi/v1/orders/{id}` and `GET /wp-json/kadochi/v1/checkout/operations/{uuid}`: authenticated, owner-only safe order summaries used for payment return and timeout reconciliation. An order owned by another customer is indistinguishable from missing.
- `GET|POST /wp-json/kadochi/v1/occasions` and `GET|PATCH|DELETE /wp-json/kadochi/v1/occasions/{id}`: authenticated owner-only records; no owner input is accepted or serialized.
- Browser cart/checkout/customer/occasion traffic uses explicit `/api/...` Next.js handlers. Cart tokens are held only in `kadochi_cart_token`, an HttpOnly same-site cookie. Checkout forwards that token and the opaque bearer token, persists delivery/packaging/postcard/operation additional fields, then lets Woo's configured Zarinpal gateway handle payment and verification. Kadochi Core rewrites the verified gateway return destination to `/checkout/return?order=…`; it does not implement a payment callback.
