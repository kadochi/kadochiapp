# Backend and WordPress Integration Implementation

## Objective

Implement the service layer and WordPress configuration required for the existing Next.js frontend to operate as a headless WooCommerce storefront. Build data access, domain models, validation, and server-side WordPress capabilities only. Do **not** create, restyle, or modify visual UI, page layouts, or presentational feature components unless a small non-visual provider or hook is strictly required for the integration.

The repository is a local Docker-based stack: the Next.js app is in `front/`, and the mounted WordPress administration theme is in `theme/`. Preserve the existing project conventions and user changes. Inspect the repository before adding files, packages, or abstractions.

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

Keep shared HTTP configuration, environment parsing, and common errors in the existing shared library location rather than duplicating them across features. Never expose privileged WordPress credentials, API keys, or internal Docker URLs to browser code. Use server-only modules for secrets and write operations that require them.

### WordPress and WooCommerce

In `theme/functions.php`, register the custom post types and SCF field groups defined below. Treat the provided field definitions as the source of truth for field names, types, return formats, and post-type associations.

- Register custom post types on `init`, with explicit capabilities, REST exposure, supports, labels, and rewrite behavior.
- Use WordPress escaping, sanitization, capability checks, nonces where applicable, and PHP coding standards.
- Make WordPress registration idempotent and avoid direct database writes or plugin-core edits.
- Register fields through the installed SCF API. If SCF is not active, fail safely with an actionable admin notice; do not silently substitute a different field-plugin API or invent incompatible metadata.
- Ensure all custom data consumed by the headless app is available through an intentional REST contract. Do not expose private user data or fields merely by setting a post type public.
- For `occasion`, enforce ownership on every read and mutation. A user must never retrieve or modify another user's records, even if they guess an ID.

WooCommerce is the commerce source of truth: use its product, price, stock, tax, cart, customer, and order models rather than duplicating those records in custom post types. The `gifts` content type is editorial content, not a replacement product catalog, unless an explicit product relationship is later specified.

## Decisions and Non-Goals

The following requirements are intentionally unspecified. Inspect the running stack and existing code for an established choice. If none exists, document the constraint and ask for a decision before implementing an insecure, irreversible, or payment-affecting substitute:

- Customer authentication method and identity provider.
- Whether checkout supports guests, registered customers, or both.
- Available payment gateways, shipping zones/methods, tax configuration, coupons, and order status transitions.
- The SCF plugin version and its supported programmatic field-registration API.
- Whether editorial custom post types need public archives, public single routes, or only headless REST reads.

Do not introduce a parallel authentication system, custom payment processor, custom product/order store, or a generic WordPress proxy endpoint. Do not add speculative features such as wishlists, subscriptions, reviews, analytics, or notifications.

## API and Data Contract Requirements

1. Inspect the WordPress and WooCommerce APIs available in the local stack before choosing endpoints or authentication. Do not assume the Store API and authenticated REST API have identical capabilities.
2. Define schemas for every external response and mutation input. Parse responses at the service boundary and return stable domain types; do not leak raw WordPress payloads into the application.
3. Validate all input before requests and return actionable, typed errors for validation, authentication, authorization, not-found, network, and upstream API failures. Do not swallow errors or return `null` for unrelated failure states.
4. Use `fetch` intentionally: set appropriate caching/revalidation for catalog and editorial data; use `no-store` for carts, customers, checkout, and user-owned occasions. Do not cache personalized data in a shared cache.
5. Encode query parameters with `URLSearchParams`, use pagination metadata where it is provided, and guard response sizes. Avoid N+1 request patterns.
6. Preserve WooCommerce session/cart cookies across the boundary selected by the existing application architecture. Do not store a cart token in a client-readable long-lived location unless the WooCommerce API requires it and its security implications are addressed.
7. Keep write methods explicit (`addItem`, `updateQuantity`, `removeItem`, `createOccasion`, `updateOccasion`, `deleteOccasion`, `createOrder`); do not use generic untyped request helpers as the public domain API.
8. Keep a short contract note next to each service: endpoint or server action, authentication/session requirement, cache policy, and expected error variants. This note must match the implementation rather than describe an intended future API.

## Delivery Workflow

1. Read the existing code, environment configuration, and API client before changing anything. Reuse established conventions where they exist.
2. Implement in small, coherent units: shared API configuration first, then product/content reads, authentication and ownership, cart mutations, and checkout.
3. Add focused tests for response mapping, input validation, error normalization, and authorization-sensitive occasion behavior. Mock external API boundaries rather than testing a live WordPress instance by default.
4. Run the relevant type check, lint, tests, and production build. Fix issues introduced by the work.
5. At completion, report the files changed, API endpoints/contracts added, environment variables required, test/build results, and any manual WordPress or plugin setup still required.

## Acceptance Criteria

- The frontend has typed, validated service methods for the required product, content, auth, cart, checkout, and occasion workflows.
- No UI or layout changes are introduced.
- WooCommerce remains the source of truth for commerce data.
- Custom post types and SCF fields below are registered correctly, are visible in WordPress admin, and expose only the REST data required by the frontend.
- Occasion operations are authenticated and ownership-safe.
- No secrets reach client bundles or source control.
- Linting, type checking, relevant tests, and the production build succeed.

## Field and Post-Type Specification

The following exported configuration is reference data. Do not treat incidental editor metadata (for example opaque field keys) as a public API. Preserve the semantic field names and compatible return formats when registering it in code.

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
