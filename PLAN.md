# Backend and WordPress Integration Implementation

## Objective

Implement the service layer and WordPress configuration required for the existing Next.js frontend to operate as a headless WooCommerce storefront. Build data access, domain models, validation, and server-side WordPress capabilities only. Do **not** create, restyle, or modify visual UI, page layouts, or presentational feature components unless a small non-visual provider or hook is strictly required for the integration.

The repository is a local Docker-based stack: the Next.js app is in `front/`, and the mounted WordPress administration theme is in `theme/`. The implementation is a **compatibility-first migration**: preserve the behavior, stored content, identifiers, and administration workflow of the current WordPress installation while adding versioned APIs, typed services, and stronger security. Inspect the running installation and repository before adding files, packages, routes, or abstractions.

Security takes precedence over backward compatibility when existing behavior exposes credentials, payment data, or private customer data. In particular, public access to `occasion` records must not be preserved.

## Compatibility and Migration Rules

1. Before implementation, capture a baseline of the running installation:
   - Active WordPress, WooCommerce, and SCF versions.
   - Registered post-type arguments and REST namespaces/routes.
   - Existing authentication, cookie, nonce, and cart-session behavior.
   - Representative REST responses for each custom post type and Woo Store API resource.
   - Existing post counts, statuses, authors, SCF metadata, and whether any consumers use current endpoints.
2. Preserve the existing post-type slugs (`slider`, `banner`, `occasion`, `gifts`, and `hero`), SCF group keys, field keys, semantic field names, return formats, and stored metadata. Do not rename or migrate them without a separately reviewed data migration and rollback plan.
3. Add versioned `/kadochi/v1` contracts alongside safe existing routes. Do not remove or change a legacy response until its consumers are identified, migrated, and covered by compatibility tests.
4. Do not register a post type or field group twice. Detect existing registration and ownership first. When an existing plugin or imported configuration is authoritative, augment it through documented hooks or migrate ownership explicitly rather than racing registration order.
5. The exported post-type configuration below is reference data, not executable PHP. Convert string booleans such as `"true"` and `"false"` to real booleans and resolve empty-string defaults deliberately. Never pass the raw export directly to `register_post_type()`.
6. Prefer a small site plugin or mu-plugin (for example `kadochi-core`) for durable CPT, SCF, capability, and REST functionality. During migration, `theme/functions.php` may load a compatibility shim, but there must be one canonical registration path and no duplicate hooks. Switching themes must not make application data or APIs disappear after migration.
7. Keep a rollback-safe migration path. Changes to visibility, capabilities, REST exposure, or ownership must be testable against a copy of existing data before production activation.

## Scope

### Next.js service layer

Implement the following feature boundaries when their functionality is needed:

```text
front/src/features/
  auth/       # current customer identity and authenticated requests
  cart/       # WooCommerce cart retrieval and mutation
  checkout/   # checkout validation and order submission
  content/    # WordPress custom-content retrieval
  occasions/  # authenticated user's occasion records
  products/   # WooCommerce catalog, product detail, and categories
```

Within a feature, use only the folders that have a concrete purpose:

- `services/`: typed calls to WordPress or WooCommerce APIs; keep HTTP and response mapping here.
- `schema/`: Zod schemas that validate untrusted API input and mutation payloads.
- `types.ts`: domain-facing TypeScript types inferred from, or aligned with, schemas.
- `utils/`: pure domain transformations such as price, date, or API-response mapping.
- `hooks/`: narrowly scoped client hooks only when client state or lifecycle behavior is necessary.
- `components/`: do not add UI here for this task. A non-visual context/provider is allowed only when required by cart or auth state.

Keep shared HTTP configuration, environment parsing, timeouts, pagination parsing, session propagation, and common errors in the existing shared library location rather than duplicating them across features. The shared HTTP helper is internal infrastructure, not the public domain API. Mark server-only modules explicitly. Never expose privileged WordPress credentials, API keys, cart tokens, nonces, internal Docker URLs, or upstream error bodies to browser code or logs.

Use a same-origin Next.js backend-for-frontend boundary for authenticated or session-sensitive operations:

```text
Browser -> action-specific Next.js route handler/server action -> WordPress/WooCommerce
```

- Product and editorial reads may run server-to-server with explicit cache policies.
- Cart, checkout, customer, authentication, and occasion operations must use action-specific same-origin handlers and `no-store`.
- Do not create a generic WordPress proxy. Forward only the method, fields, headers, and cookies required by each domain operation.
- Store a Woo cart identifier only in an `HttpOnly`, `Secure` (in production), `SameSite` cookie. Rotate or replace upstream cart or nonce headers when Woo returns updated values.
- Protect cookie-authenticated mutations with allowed-origin/Host checks in addition to upstream nonce or token validation.

### WordPress and WooCommerce

Register or adopt the custom post types and SCF field groups defined below through the canonical WordPress application module selected by the compatibility audit. Treat the provided field definitions as the source of truth for stable keys, field names, types, return formats, and post-type associations.

- Register custom post types on `init`, with explicit capabilities, REST exposure, supports, labels, and rewrite behavior.
- Use WordPress escaping, sanitization, capability checks, nonces where applicable, and PHP coding standards.
- Make WordPress registration idempotent and avoid direct database writes or plugin-core edits.
- Register local field groups through the installed SCF API only after its supported API is available. If SCF is not active or the installed version is incompatible, fail safely with an actionable administrator notice and a failed health check; do not silently substitute a different field-plugin API or invent incompatible metadata.
- Ensure all custom data consumed by the headless app is available through an intentional REST contract. Do not expose private user data or fields merely by setting a post type public.
- Use a versioned, normalized content DTO rather than exposing the raw SCF response shape as the frontend domain model. A recommended public contract is `GET /wp-json/kadochi/v1/content/home`.
- For `occasion`, enforce ownership on every query, read, mutation, and serialization step. A user must never enumerate, retrieve, create for, or modify another user's records, even if they guess an ID.

WooCommerce is the commerce source of truth: use its product, price, stock, tax, cart, customer, and order models rather than duplicating those records in custom post types. The `gifts` content type is editorial content, not a replacement product catalog, unless an explicit product relationship is later specified.

### Custom post-type security rules

- Editorial types (`slider`, `banner`, `gifts`, and `hero`) keep their existing identifiers and content. After the compatibility audit, disable public single/archive/rewrite behavior when it is unused, while retaining the administration UI and the intentional content API.
- `occasion` must be non-public, non-publicly-queryable, excluded from search and navigation, and have no public rewrite. Keep its administration UI. Do not expose it through the default `WP_REST_Posts_Controller`.
- Expose occasions only through `GET|POST /wp-json/kadochi/v1/occasions` and `GET|PATCH|DELETE /wp-json/kadochi/v1/occasions/{id}` with explicit request schemas and `permission_callback` functions.
- Use `post_author` as the canonical occasion owner and derive it from the authenticated user. Never accept `user`, `user_id`, or `author` from a customer payload. Preserve the SCF `user` field only as a server-maintained compatibility mirror when existing content depends on it.
- Query occasion collections by canonical owner before pagination. For an item owned by another customer, return the same not-found response used for a missing ID to prevent enumeration. Define and test whether administrators have an explicit support override.
- Use custom mapped capabilities for application-owned post types and assign them deliberately to administrator/editor/shop roles. Ordinary customer accounts must not receive broad post-editing capabilities; access to their occasions is enforced by the custom controller.
- Decide whether native `post_title` or the SCF `title` field is canonical for each existing type after inspecting real data. Add one-way synchronization and a compatibility migration where both are populated; never let two unsynchronized titles leak into domain responses.
- Treat `gifts.price` as optional editorial display metadata only. It must never affect Woo product, cart, tax, payment, or order totals. A sellable gift requires an explicit Woo product relationship.
- Validate `background_gradient` against an approved representation before using it in generated CSS. Sanitize URLs with URL-specific functions and normalize every image return format into a stable domain image object.

## Decisions and Non-Goals

The following requirements are Phase 0 gates. Inspect the running stack and existing code for an established choice. If none exists, document the constraint and obtain a decision before implementing an insecure, irreversible, identity-affecting, or payment-affecting substitute:

- Customer authentication method and identity provider.
- Whether checkout supports guests, registered customers, or both.
- Available payment gateways, shipping zones/methods, tax configuration, coupons, and order status transitions.
- The installed WooCommerce and SCF versions, their supported programmatic APIs, and how those plugins are reproducibly provisioned and activated.
- Whether editorial custom post types need public archives, public single routes, or only headless REST reads.
- Whether existing consumers depend on the current custom post-type REST routes or response shapes.
- Whether occasion deletion follows soft-delete/trash, permanent deletion, or a retention policy when a customer account is deleted.

Do not introduce a parallel authentication system, custom payment processor, custom product/order store, or a generic WordPress proxy endpoint. Do not add speculative features such as wishlists, subscriptions, reviews, analytics, or notifications.

## API and Data Contract Requirements

1. Inspect and snapshot the WordPress and WooCommerce APIs available in the local stack before choosing endpoints or authentication. Do not assume the Store API and authenticated REST API have identical capabilities, and do not use Woo REST API credentials as customer authentication.
2. Define schemas for every external response and mutation input. Parse responses at the service boundary and return stable domain types; do not leak raw WordPress payloads into the application.
3. Validate all input before requests and return a discriminated error model covering validation, unauthenticated, forbidden, not-found, conflict, rate-limited, timeout, network, malformed-upstream-response, and upstream failure. Include a safe code, HTTP status, optional field errors, retryability, and request ID. Do not swallow errors or return `null` for unrelated failure states.
4. Use `fetch` intentionally: define TTL/tags/invalidation for catalog and editorial data; use `no-store` for carts, customers, checkout, authentication, and user-owned occasions. Do not cache a response that varies by cookie, authorization, cart token, nonce, or customer identity in a shared cache. Cart and checkout must always revalidate price, stock, tax, shipping, and totals through WooCommerce.
5. Encode query parameters with `URLSearchParams`, use pagination metadata where it is provided, and guard response sizes. Avoid N+1 request patterns.
6. Preserve WooCommerce cart/session state through the same-origin boundary. Prefer Woo Store API Cart Tokens for the headless cart when supported by the inspected version; keep them out of client-readable long-lived storage and never log them. Preserve and rotate Woo nonce headers if nonce mode is selected instead.
7. Use Woo Store API for customer-facing product, cart, shipping, and checkout workflows. Use authenticated Woo REST endpoints only for explicitly approved administrative integrations. Submit storefront checkout through Woo's checkout API; do not create customer orders directly through `/wc/v3/orders`.
8. Keep domain methods explicit; do not expose a generic untyped request helper. Use the following initial public service inventory:

| Feature | Required public methods |
| --- | --- |
| Products | `listProducts(query)`, `getProductById(id)`, `getProductBySlug(slug)`, `listCategories(query)` |
| Content | `getHomepageContent()`; add individual list/item methods only when an actual consumer requires them |
| Auth | `getCurrentCustomer()`, server-only `requireCustomer()`; add `login`, `logout`, or `register` only after the identity contract is selected |
| Cart | `getCart()`, `addItem(input)`, `updateQuantity(itemKey, quantity)`, `removeItem(itemKey)`, `updateCustomer(addresses)`, `selectShippingRate(input)` |
| Checkout | `getCheckoutState()`, `submitCheckout(input)` |
| Occasions | `listOccasions(query)`, `getOccasion(id)`, `createOccasion({ title, occasionDate })`, `updateOccasion(id, patch, version)`, `deleteOccasion(id, version)` |

9. No occasion service input may contain a user or author ID. Validate occasion dates as real date-only `YYYY-MM-DD` values without timezone conversion. Define requiredness and length limits at the mutation schema even when the SCF editor field is optional.
10. Represent Woo money as amount strings in minor units plus currency code and minor-unit metadata. Do not use floating-point arithmetic for commerce totals.
11. Do not automatically retry mutation requests. Retry only bounded idempotent reads by default. For checkout, prevent concurrent submission, propagate a client operation identifier where the selected gateway or architecture supports it, and define how to reconcile a timeout with Woo's draft or pending order before allowing another payment attempt.
12. Normalize the custom fields into stable domain DTOs:
    - Banner: `id`, `title`, `subtitle`, `ctaText`, `ctaLink`, `backgroundGradient`, `backgroundImage`.
    - Hero: `id`, `title`, `ctaText`, `ctaLink`, `backgroundImage`.
    - Slider: `id`, `sliderTitle`, `sliderButtonText`, `sliderLink`, `backgroundImage`.
    - Gift editorial: `id`, `title`, `description`, `image`, optional editorial `price`.
    - Occasion: `id`, `title`, `occasionDate`, `version`; never expose the owner field in a customer DTO.
13. Keep a contract note next to each service: public method, upstream endpoint or server action, input/output schema, authentication/session requirement, cache policy, possible errors, retry policy, and idempotency behavior. The note must match the implementation rather than describe an intended future API.

## Delivery Workflow

1. **Baseline and provision:** inspect the existing code and running installation, capture compatibility fixtures, pin/provision WooCommerce and SCF, and record the Phase 0 decisions.
2. **WordPress application module:** establish the canonical plugin/mu-plugin or compatibility loader, adopt/register CPTs and SCF groups idempotently, define capabilities, add health checks/admin notices, and secure occasion storage and routes.
3. **Shared Next.js infrastructure:** add validated environment parsing, server-only clients, Zod schemas, timeouts, pagination, safe error normalization, request IDs, and cart/session propagation.
4. **Public reads:** implement normalized product and content services with bounded pagination and explicit cache behavior. Verify compatibility with existing content and URLs.
5. **Identity and occasions:** implement the selected customer identity bridge and owner-scoped occasion methods. Do not proceed on an assumed authentication mechanism.
6. **Cart:** implement Store API cart retrieval/mutations, address updates, shipping-rate selection, and token/nonce rotation. Add coupons only if confirmed in Phase 0.
7. **Checkout:** implement Woo Store API checkout for the confirmed guest/customer policy and installed gateways. Add duplicate-submit protection, rate limiting, and payment-result reconciliation.
8. **Verification:** run TypeScript unit/contract tests, PHP permission tests, Docker integration smoke tests, typecheck, lint, and production build. Fix issues introduced by the work.
9. At completion, report files changed, compatibility decisions, routes/contracts added, environment variables, plugin/manual setup, migrations, rollback instructions, and all verification results.

## Acceptance Criteria

- Existing post-type slugs, SCF group/field keys, field names, stored metadata, and safe administration workflows remain compatible, with compatibility tests covering representative existing records.
- The frontend has typed, runtime-validated service methods for the required product, content, auth, cart, checkout, and occasion workflows.
- No UI or layout changes are introduced.
- WooCommerce remains the source of truth for commerce data.
- Custom post types and SCF fields below are adopted or registered exactly once, remain visible in WordPress admin, and expose only intentional versioned REST data.
- The raw exported string booleans are normalized into explicit WordPress arguments and are not copied blindly.
- Anonymous users cannot enumerate or retrieve occasions through front-end queries, search, default WordPress REST routes, or custom routes.
- An authenticated customer can access only their own occasions; forged owner input is ignored or rejected; cross-user list/get/update/delete tests pass; the administrator exception, if any, is explicit and tested.
- Woo Store API cart and checkout state survives through the same-origin BFF without exposing cart tokens, nonces, API credentials, or payment data to client bundles, source control, or logs.
- Catalog/editorial caching is explicit, and no personalized response can enter a shared cache.
- Checkout uses Woo's checkout/payment flow, is not automatically retried, and has tested duplicate-submission and timeout-reconciliation behavior appropriate to the configured gateway.
- SCF/Woo absence or incompatible versions produce actionable health/admin failures rather than fatal errors or silent fallback behavior.
- TypeScript mapper/schema/error/session tests, PHP authorization tests, and Docker contract smoke tests pass in addition to linting, type checking, and the production build.

## Field and Post-Type Specification

The following exported configuration is compatibility reference data. Preserve group keys, field keys, semantic field names, types, associations, and compatible return formats when adopting or registering it. Do not expose opaque keys as part of the public application API, and do not execute the raw exported post-type values without normalizing their string booleans and resolving the security overrides above.

### Custom fields

[
{
"key": "group_684b373196d67",
"title": "Banner",
"fields": [
{
"key": "field_684b3731a9469",
"label": "Title",
"name": "title",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_684b3761a946a",
"label": "Subtitle",
"name": "subtitle",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_684b376ca946b",
"label": "CTA Text",
"name": "cta_text",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_684b377ba946c",
"label": "CTA Link",
"name": "cta_link",
"aria-label": "",
"type": "url",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"allow_in_bindings": 0,
"placeholder": ""
},
{
"key": "field_684b3788a946d",
"label": "Background Gradient",
"name": "background_gradient",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_684b37cea946e",
"label": "Background Image",
"name": "background_image",
"aria-label": "",
"type": "image",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"return_format": "url",
"library": "all",
"min_width": "",
"min_height": "",
"min_size": "",
"max_width": "",
"max_height": "",
"max_size": "",
"mime_types": "",
"allow_in_bindings": 0,
"preview_size": "medium"
}
],
"location": [
[
{
"param": "post_type",
"operator": "==",
"value": "banner"
}
]
],
"menu_order": 0,
"position": "normal",
"style": "default",
"label_placement": "top",
"instruction_placement": "label",
"hide_on_screen": "",
"active": true,
"description": "",
"show_in_rest": 0,
"display_title": "",
"allow_ai_access": false,
"ai_description": ""
},
{
"key": "group_686d3471a96bc",
"title": "Gifts",
"fields": [
{
"key": "field_686d347151270",
"label": "Image",
"name": "image",
"aria-label": "",
"type": "image",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"return_format": "url",
"library": "all",
"min_width": "",
"min_height": "",
"min_size": "",
"max_width": "",
"max_height": "",
"max_size": "",
"mime_types": "",
"allow_in_bindings": 0,
"preview_size": "medium"
},
{
"key": "field_686d348351271",
"label": "Price",
"name": "price",
"aria-label": "",
"type": "number",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"min": "",
"max": "",
"allow_in_bindings": 0,
"placeholder": "",
"step": "",
"prepend": "",
"append": ""
},
{
"key": "field_686d349151272",
"label": "Title",
"name": "title",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_686ed667a9d8a",
"label": "Description",
"name": "description",
"aria-label": "",
"type": "textarea",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"rows": "",
"placeholder": "",
"new_lines": ""
}
],
"location": [
[
{
"param": "post_type",
"operator": "==",
"value": "gifts"
}
]
],
"menu_order": 0,
"position": "normal",
"style": "default",
"label_placement": "top",
"instruction_placement": "label",
"hide_on_screen": "",
"active": true,
"description": "",
"show_in_rest": 0,
"display_title": "",
"allow_ai_access": false,
"ai_description": ""
},
{
"key": "group_68ff3b5e2403e",
"title": "Hero",
"fields": [
{
"key": "field_68ff3b5e2bc20",
"label": "Title",
"name": "title",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_68ff3b5e2bccb",
"label": "CTA Text",
"name": "cta_text",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_68ff3b5e2bd1c",
"label": "CTA Link",
"name": "cta_link",
"aria-label": "",
"type": "url",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"allow_in_bindings": 0,
"placeholder": ""
},
{
"key": "field_68ff3b5e2bdb4",
"label": "Background Image",
"name": "background_image",
"aria-label": "",
"type": "image",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"return_format": "url",
"library": "all",
"min_width": "",
"min_height": "",
"min_size": "",
"max_width": "",
"max_height": "",
"max_size": "",
"mime_types": "",
"allow_in_bindings": 0,
"preview_size": "medium"
}
],
"location": [
[
{
"param": "post_type",
"operator": "==",
"value": "hero"
}
]
],
"menu_order": 0,
"position": "normal",
"style": "default",
"label_placement": "top",
"instruction_placement": "label",
"hide_on_screen": "",
"active": true,
"description": "",
"show_in_rest": 0,
"display_title": "",
"allow_ai_access": false,
"ai_description": ""
},
{
"key": "group_684ada15be887",
"title": "Image Slider",
"fields": [
{
"key": "field_684ada1598922",
"label": "Background Image",
"name": "background_image",
"aria-label": "",
"type": "image",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"return_format": "array",
"library": "all",
"min_width": "",
"min_height": "",
"min_size": "",
"max_width": "",
"max_height": "",
"max_size": "",
"mime_types": "",
"allow_in_bindings": 0,
"preview_size": "medium"
},
{
"key": "field_684ada7298923",
"label": "Slider Title",
"name": "slider_title",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_684adaa998924",
"label": "Slider Button Text",
"name": "slider_button_text",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_684adabd98925",
"label": "Slider Link",
"name": "slider_link",
"aria-label": "",
"type": "link",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"return_format": "url",
"allow_in_bindings": 0
}
],
"location": [
[
{
"param": "post_type",
"operator": "==",
"value": "slider"
}
]
],
"menu_order": 0,
"position": "normal",
"style": "default",
"label_placement": "top",
"instruction_placement": "label",
"hide_on_screen": "",
"active": true,
"description": "",
"show_in_rest": 0,
"display_title": "",
"allow_ai_access": false,
"ai_description": ""
},
{
"key": "group_68690d0e375df",
"title": "Occasion",
"fields": [
{
"key": "field_68690d0e8d04d",
"label": "title",
"name": "title",
"aria-label": "",
"type": "text",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"default_value": "",
"maxlength": "",
"allow_in_bindings": 0,
"placeholder": "",
"prepend": "",
"append": ""
},
{
"key": "field_68690d148d04e",
"label": "occasion date",
"name": "occasion_date",
"aria-label": "",
"type": "date_picker",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"display_format": "Y-m-d",
"return_format": "Y-m-d",
"first_day": 6,
"allow_in_bindings": 0,
"default_to_current_date": 0
},
{
"key": "field_699c24f932f43",
"label": "user",
"name": "user",
"aria-label": "",
"type": "user",
"instructions": "",
"required": 0,
"conditional_logic": 0,
"wrapper": {
"width": "",
"class": "",
"id": ""
},
"role": "",
"return_format": "id",
"multiple": 0,
"allow_null": 0,
"allow_in_bindings": 0,
"bidirectional": 0,
"bidirectional_target": []
}
],
"location": [
[
{
"param": "post_type",
"operator": "==",
"value": "occasion"
}
]
],
"menu_order": 0,
"position": "normal",
"style": "default",
"label_placement": "top",
"instruction_placement": "label",
"hide_on_screen": "",
"active": true,
"description": "",
"show_in_rest": 0,
"display_title": "",
"allow_ai_access": false,
"ai_description": ""
}
]

## Custom Post types

{"slider":{"name":"slider","label":"Sliders","singular_label":"Slider","description":"","public":"true","publicly_queryable":"true","show_ui":"true","show_in_nav_menus":"true","delete_with_user":"false","show_in_rest":"true","rest_base":"","rest_controller_class":"","rest_namespace":"","has_archive":"false","has_archive_string":"","exclude_from_search":"false","capability_type":"post","hierarchical":"false","can_export":"false","rewrite":"true","rewrite_slug":"","rewrite_withfront":"true","query_var":"true","query_var_slug":"","menu_position":"","show_in_menu":"true","show_in_menu_string":"","menu_icon":null,"register_meta_box_cb":null,"supports":["title","editor","thumbnail"],"taxonomies":[],"labels":{"menu_name":"","all_items":"","add_new":"","add_new_item":"","edit_item":"","new_item":"","view_item":"","view_items":"","search_items":"","not_found":"","not_found_in_trash":"","parent_item_colon":"","featured_image":"","set_featured_image":"","remove_featured_image":"","use_featured_image":"","archives":"","insert_into_item":"","uploaded_to_this_item":"","filter_items_list":"","items_list_navigation":"","items_list":"","attributes":"","name_admin_bar":"","item_published":"","item_published_privately":"","item_reverted_to_draft":"","item_trashed":"","item_scheduled":"","item_updated":""},"custom_supports":"","enter_title_here":""},"banner":{"name":"banner","label":"Banners","singular_label":"Banner","description":"","public":"true","publicly_queryable":"true","show_ui":"true","show_in_nav_menus":"true","delete_with_user":"false","show_in_rest":"true","rest_base":"","rest_controller_class":"","rest_namespace":"","has_archive":"false","has_archive_string":"","exclude_from_search":"false","capability_type":"post","hierarchical":"false","can_export":"false","rewrite":"true","rewrite_slug":"","rewrite_withfront":"true","query_var":"true","query_var_slug":"","menu_position":"","show_in_menu":"true","show_in_menu_string":"","menu_icon":null,"register_meta_box_cb":null,"supports":["title","editor","thumbnail"],"taxonomies":[],"labels":{"menu_name":"","all_items":"","add_new":"","add_new_item":"","edit_item":"","new_item":"","view_item":"","view_items":"","search_items":"","not_found":"","not_found_in_trash":"","parent_item_colon":"","featured_image":"","set_featured_image":"","remove_featured_image":"","use_featured_image":"","archives":"","insert_into_item":"","uploaded_to_this_item":"","filter_items_list":"","items_list_navigation":"","items_list":"","attributes":"","name_admin_bar":"","item_published":"","item_published_privately":"","item_reverted_to_draft":"","item_trashed":"","item_scheduled":"","item_updated":""},"custom_supports":"","enter_title_here":""},"occasion":{"name":"occasion","label":"Occasions","singular_label":"Occasion","description":"","public":"true","publicly_queryable":"true","show_ui":"true","show_in_nav_menus":"true","delete_with_user":"false","show_in_rest":"true","rest_base":"","rest_controller_class":"","rest_namespace":"","has_archive":"false","has_archive_string":"","exclude_from_search":"false","capability_type":"post","hierarchical":"false","can_export":"false","rewrite":"true","rewrite_slug":"","rewrite_withfront":"true","query_var":"true","query_var_slug":"","menu_position":"","show_in_menu":"true","show_in_menu_string":"","menu_icon":null,"register_meta_box_cb":null,"supports":["title","editor","thumbnail","author"],"taxonomies":[],"labels":{"menu_name":"","all_items":"","add_new":"","add_new_item":"","edit_item":"","new_item":"","view_item":"","view_items":"","search_items":"","not_found":"","not_found_in_trash":"","parent_item_colon":"","featured_image":"","set_featured_image":"","remove_featured_image":"","use_featured_image":"","archives":"","insert_into_item":"","uploaded_to_this_item":"","filter_items_list":"","items_list_navigation":"","items_list":"","attributes":"","name_admin_bar":"","item_published":"","item_published_privately":"","item_reverted_to_draft":"","item_trashed":"","item_scheduled":"","item_updated":"","template_name":""},"custom_supports":"","enter_title_here":""},"gifts":{"name":"gifts","label":"Gifts","singular_label":"Gift","description":"","public":"true","publicly_queryable":"true","show_ui":"true","show_in_nav_menus":"true","delete_with_user":"false","show_in_rest":"true","rest_base":"","rest_controller_class":"","rest_namespace":"","has_archive":"false","has_archive_string":"","exclude_from_search":"false","capability_type":"post","hierarchical":"false","can_export":"false","rewrite":"true","rewrite_slug":"","rewrite_withfront":"true","query_var":"true","query_var_slug":"","menu_position":"","show_in_menu":"true","show_in_menu_string":"","menu_icon":null,"register_meta_box_cb":null,"supports":["title","editor","thumbnail"],"taxonomies":[],"labels":{"menu_name":"","all_items":"","add_new":"","add_new_item":"","edit_item":"","new_item":"","view_item":"","view_items":"","search_items":"","not_found":"","not_found_in_trash":"","parent_item_colon":"","featured_image":"","set_featured_image":"","remove_featured_image":"","use_featured_image":"","archives":"","insert_into_item":"","uploaded_to_this_item":"","filter_items_list":"","items_list_navigation":"","items_list":"","attributes":"","name_admin_bar":"","item_published":"","item_published_privately":"","item_reverted_to_draft":"","item_trashed":"","item_scheduled":"","item_updated":""},"custom_supports":"","enter_title_here":""},"hero":{"name":"hero","label":"Hero","singular_label":"Hero","description":"","public":"true","publicly_queryable":"true","show_ui":"true","show_in_nav_menus":"true","delete_with_user":"false","show_in_rest":"true","rest_base":"","rest_controller_class":"","rest_namespace":"","has_archive":"false","has_archive_string":"","exclude_from_search":"false","capability_type":"post","hierarchical":"false","can_export":"false","rewrite":"true","rewrite_slug":"","rewrite_withfront":"true","query_var":"true","query_var_slug":"","menu_position":"","show_in_menu":"true","show_in_menu_string":"","menu_icon":null,"register_meta_box_cb":null,"supports":["title","editor","thumbnail"],"taxonomies":[],"labels":{"menu_name":"","all_items":"","add_new":"","add_new_item":"","edit_item":"","new_item":"","view_item":"","view_items":"","search_items":"","not_found":"","not_found_in_trash":"","parent_item_colon":"","featured_image":"","set_featured_image":"","remove_featured_image":"","use_featured_image":"","archives":"","insert_into_item":"","uploaded_to_this_item":"","filter_items_list":"","items_list_navigation":"","items_list":"","attributes":"","name_admin_bar":"","item_published":"","item_published_privately":"","item_reverted_to_draft":"","item_trashed":"","item_scheduled":"","item_updated":"","template_name":""},"custom_supports":"","enter_title_here":""}}
