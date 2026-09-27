# Kadochi integration runbook

## Baseline status

The local Docker stack was stopped while this change was implemented, so no running WordPress/WooCommerce/SCF version, route, record, or session fixture was available to snapshot. Do not enable this plugin in a production-like installation before recording the following in the deployment ticket:

- WordPress, WooCommerce, and SCF versions; active plugins; registered custom types/routes; and representative API responses.
- Counts/statuses/authors and SCF metadata for `slider`, `banner`, `hero`, and `occasion`.
- Existing consumers of the legacy custom-post REST routes.
- The customer identity provider, WordPress cookie/nonce bridge, guest policy, gateways, shipping, tax, coupons, and occasion retention policy.

The selected retention behavior in this implementation is WordPress trash (not permanent deletion). No administrator support override exists for customer occasions: even administrators use their own ownership scope through the customer API.

## Installation and migration

1. Start the stack, activate the provisioned **Secure Custom Fields** release and WooCommerce, then activate **Kadochi Core** under Plugins. The Docker compose file mounts it at `wp-content/plugins/kadochi-core`.
2. Confirm the `kadochi/v1/health` response as an administrator. Resolve any SCF notice before publishing content.
3. Snapshot representative records before activation. Existing post-type registrations are adopted rather than re-registered; the plugin only registers missing types. Existing `occasion` registrations are force-hardened: no public/query/search/rewrite/default REST access remains.
4. Confirm the normalized public route at `GET /wp-json/kadochi/v1/content/home`. Keep existing editorial REST routes during the compatibility audit; do not disable them until their consumers have migrated.
5. Set `WP_ENVIRONMENT_TYPE=production` and `MELIPAYAMAK_OTP_URL` before production testing. Kadochi Core owns OTP verification and bearer JWT authentication; the BFF keeps the opaque token in an HttpOnly cookie and forwards it only to protected WordPress routes.
6. The Docker image provisions the official ZarinPal for WooCommerce plugin (gateway ID `WC_ZPal`). Activate it and configure its merchant credentials in WooCommerce, then set `KADOCHI_FRONTEND_URL` to the public Next.js origin. If using another gateway, set `KADOCHI_PAYMENT_METHOD_ID` to its exact case-sensitive Woo ID in both services. Verify gateway, shipping, tax, bearer-associated customer orders, additional-field persistence, duplicate-payment, and timeout reconciliation behavior.
7. To offer Snapp! Pay, set the `SNAPPPAY_*` credentials on the WordPress service, enable **پرداخت اقساطی اسنپ‌پی** (`kadochi_snapppay`) under WooCommerce → Settings → Payments, and add it to `KADOCHI_PAYMENT_METHOD_IDS` (for example `WC_ZPal,kadochi_snapppay`) in both services. Snapp must whitelist the server's outgoing IP and the WordPress origin that receives the callback. `kadochi/v1/health` reports missing credentials. See [the Snapp! Pay plan](SNAPPPAY-IMPLEMENTATION-PLAN.md) for the staging checklist.

## Rollback

Deactivate Kadochi Core to remove its custom REST routes and registrations, then flush rewrite rules. Records and SCF post metadata are not deleted. Restore the pre-activation database snapshot to revert visibility/capability changes for an imported `occasion` type. Do not remove or rename field/group keys without a separately tested data migration.

## Contracts

- `GET /wp-json/kadochi/v1/content/home`: normalized editorial DTO, public, cacheable.
- `POST /wp-json/kadochi/v1/auth/otp/start` and `POST /wp-json/kadochi/v1/auth/otp/verify`: WordPress-owned OTP challenge and JWT issuance. The verification response is consumed only by the BFF.
- `GET /wp-json/kadochi/v1/customer`: current customer only, authenticated.
- `GET /wp-json/kadochi/v1/orders/{id}` and `GET /wp-json/kadochi/v1/checkout/operations/{uuid}`: authenticated, owner-only safe order summaries used for payment return and timeout reconciliation. An order owned by another customer is indistinguishable from missing.
- `GET|POST /wp-json/kadochi/v1/occasions` and `GET|PATCH|DELETE /wp-json/kadochi/v1/occasions/{id}`: authenticated owner-only records; no owner input is accepted or serialized.
- `GET /wp-json/kadochi/v1/checkout/payment-options?amount=<IRR>`: authenticated. Lists the allow-listed gateways; Snapp! Pay appears only when enabled and Snapp's eligibility call accepts the amount, with Snapp's `title_message` and `description` verbatim. Rate-limited per customer and never cached.
- `POST /wc-api/kadochi_snapppay`: Snapp! Pay's browser callback (`transactionId`, `state`, `amount`). WordPress verifies and settles server-to-server (verify is sent at most once per payment, under a per-order lock), then redirects with 303 to `/checkout/return?order=…` or `/checkout/failure?order=…`.
- Browser cart/checkout/customer/occasion traffic uses explicit `/api/...` Next.js handlers. Cart tokens are held only in `kadochi_cart_token`, an HttpOnly same-site cookie. Checkout forwards that token and the opaque bearer token, persists delivery/packaging/postcard/operation additional fields, then lets the selected allow-listed Woo gateway handle payment. ZarinPal verifies through its own plugin, and Kadochi Core rewrites its verified return destination to `/checkout/return?order=…`. Snapp! Pay uses Kadochi Core's own callback above.

## Snapp! Pay operations

- **Reconciliation.** Unresolved Snapp! Pay payments (a verify or settle that timed out, or a callback interrupted mid-finalisation) are resumed from Snapp's `status` by the `kadochi_snapppay_reconcile` WP-Cron event every five minutes, by the result page's order-summary read (throttled per order), and by the **Sync Snapp! Pay status** order action. A `PENDING` payment is verified only after an `OK` callback was received. Production currently sets `KADOCHI_DISABLE_WP_CRON=true`, so until a system scheduler runs WP-Cron, the result-page read and the manual action are the only reconciliation paths.
- **Refunds.** A full WooCommerce refund calls Snapp's `cancel`; a partial refund calls `update` with the remaining cart. Snapp rejects partial updates for orders paid with a Snapp discount code (error 1078); refund the whole order instead. Every outcome adds an order note.
- **Logs.** WooCommerce logs under source `kadochi-snapppay` carry only event names, order IDs, transaction IDs, HTTP statuses, error codes, and durations: never tokens, phone numbers, or credentials.

## Support center

Kadochi Core registers hidden `support_conversation` and `support_message` records
and installs the indexed `kadochi_support_conversations` and
`kadochi_support_messages` lookup tables on activation or upgrade. Administrators
and shop managers receive `manage_kadochi_support` and can use the **Support**
screen in WordPress administration.

Storefront requests use the same-origin `/api/support/*` BFF. Signed guest
identity is kept in the 180-day HttpOnly `kadochi_support_guest` cookie; it is
never returned to browser JavaScript. No support-specific environment secret is
required because WordPress derives the signing key from its authentication salt.

Back up the database before deployment, deploy the plugin files, and visit any
WordPress request once to run the versioned table/capability upgrade. Verify the
Support menu, create one guest conversation, reply as staff, and confirm the
storefront receives the reply. Deactivation removes routes and UI registration
but deliberately retains conversation posts and lookup tables.
