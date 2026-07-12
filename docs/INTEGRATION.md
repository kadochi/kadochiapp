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
5. Configure an actual same-site WordPress cookie and REST nonce bridge, then set `KADOCHI_AUTH_MODE=wordpress-cookie`. The BFF intentionally refuses identity/occasion actions until this is selected; it does not create a parallel login system.
6. Verify gateway, shipping, tax, guest/customer, duplicate-payment, and timeout reconciliation behavior. Only then set `KADOCHI_CHECKOUT_ENABLED=true`.

## Rollback

Deactivate Kadochi Core to remove its custom REST routes and registrations, then flush rewrite rules. Records and SCF post metadata are not deleted. Restore the pre-activation database snapshot to revert visibility/capability changes for an imported `occasion` type. Do not remove or rename field/group keys without a separately tested data migration.

## Contracts

- `GET /wp-json/kadochi/v1/content/home`: normalized editorial DTO, public, cacheable.
- `GET /wp-json/kadochi/v1/customer`: current customer only, authenticated.
- `GET|POST /wp-json/kadochi/v1/occasions` and `GET|PATCH|DELETE /wp-json/kadochi/v1/occasions/{id}`: authenticated owner-only records; no owner input is accepted or serialized.
- Browser cart/checkout/customer/occasion traffic uses explicit `/api/...` Next.js handlers. Cart tokens are held only in `kadochi_cart_token`, an HttpOnly same-site cookie.
