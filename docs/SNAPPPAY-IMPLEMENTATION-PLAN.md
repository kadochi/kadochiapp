# Snapp! Pay integration plan

Status: plan only, nothing implemented yet. Written 2026-09-21 from the vendor bundle in `snapp/`:

- REST API document v2.1 (updated 2026-01-19)
- Postman collection
- Full error-code sheet
- Merchant IP guide
- Payment-method style guide
- PDP on-site messaging kit

## 1. What Snapp! Pay is and what it requires

Snapp! Pay is a credit, buy-now-pay-later method. The customer pays a first instalment (INSTALLMENT), the whole amount at month end (POSTPAID), or uses a financing plan (FINANCING). Kadochi receives the full order amount from Snapp. For us it behaves like a redirect gateway, but the finalisation protocol has two phases (verify, then settle) and the order can be changed after payment (cancel and update).

### 1.1 API surface

The staging base URL is in `snapp/kadochi-stage.txt`. Production is issued only after Snapp's pre-demo and demo review.

| # | Call | Endpoint | Notes |
|---|------|----------|-------|
| 1 | Auth | `POST /api/online/v1/oauth/token` | `Authorization: Basic base64(client_id:client_secret)`, form body `grant_type=password&scope=online-merchant&username=…&password=…`. Returns `access_token` with `expires_in` 3600. Send it as `Bearer` on every other call and refresh it before expiry. |
| 2 | Eligible | `GET /api/online/offer/v1/eligible?amount=<IRR>[&paymentMethodTypes=…]` | Returns `{ eligible, title_message, description }`. **Mandatory.** Call it again whenever the amount changes. Show `title_message` and `description` **exactly as returned**. Hide the method when the result is `false`. Never compute instalments yourself. Staging returns false below 40,000 Toman and above 10M Toman; production limits differ. |
| 3 | Payment token | `POST /api/online/payment/v1/token` | Body fields are listed in §1.2. Returns `{ paymentToken, paymentPageUrl }`; redirect the customer to `paymentPageUrl`. |
| 4 | Callback (ours) | Snapp → `returnURL` | Snapp sends a browser **form POST** with `transactionId`, `state` (`OK` or `FAILED`) and `amount`. The returnURL domain must match the domain whitelisted with Snapp. |
| 5 | Verify | `POST /api/online/payment/v1/verify` | Body `{ paymentToken }`. Call it **exactly once** per payment, even if the callback arrives several times. If verify is not called within a limited window, Snapp refunds the customer automatically. Use a 30 s timeout. |
| 6 | Settle | `POST /api/online/payment/v1/settle` | Body `{ paymentToken }`. **Mandatory** after a successful verify. The purchase is final only after settle. |
| 7 | Status | `GET /api/online/payment/v1/status?paymentToken=…` | Returns `{ transactionId, status, amount }`. Status is one of `PENDING`, `VERIFY`, `SETTLE`, `REVERT`, `CANCEL`. Use it for reconciliation. |
| 8 | Revert | `POST /api/online/payment/v1/revert` | Refunds a payment that is still pending or verified, but not yet settled. The document says this is not required unless Snapp asks for it. The callback section still says to revert when the state is `FAILED`. See open question Q4. |
| 9 | Cancel | `POST /api/online/payment/v1/cancel` | Fully cancels a **settled** payment. **Implementation is mandatory.** Get admin confirmation first because it cannot be undone. |
| 10 | Update | `POST /api/online/payment/v1/update` | Lowers the amount or removes items of a settled order. The new amount must be ≤ the original. **Mandatory for multi-item shops**, which includes Kadochi. Needs admin confirmation. Fails with error 1078 when the customer used a Snapp discount code; the only option then is cancel. |

Every endpoint uses the same response envelope:

- Success: `{ successful: true, response: {…} }`
- Error: `{ successful: false, errorData: { errorCode, message, data } }`

### 1.2 Token payload and its rules

Request fields:

```
amount, discountAmount, externalSourceAmount, mobile, returnURL, transactionId,
cartList[{ cartId, isShipmentIncluded, isTaxIncluded, shippingAmount, taxAmount, totalAmount,
           cartItems[{ id, amount, category, count, name, commissionType }] }],
forcedPaymentMethodTypes?   // optional; only has an effect if Snapp enables it for us
```

Field rules:

- **All amounts are IRR integers.**
- `mobile` must match `+98\d{10}` (error 1005). `Kadochi_Core::canonical_phone()` already produces exactly this format.
- `transactionId` must be unique per purchase, 5 to 10 characters. If it is longer than 10 characters it must contain a letter. Reusing one gives 409 / 1009.
- `commissionType` defaults to `100` unless the contract maps our categories to other codes (see Q3).
- Required amount identities:
  - Per cart: `Σ(count × item.amount) + shipping (if not included) + tax (if not included) = totalAmount`
  - Order: `Σ cart.totalAmount − discountAmount − externalSourceAmount = amount`

### 1.3 Required finalisation state machine (doc pages 20–21)

```
callback OK ─► verify (30s timeout)
                 ├─ success ─► settle
                 ├─ timeout/5xx ─► status: VERIFY → settle · PENDING → verify again · other → fail
                 └─ 4xx (1011 wrong state, 1007/100 bad token, 1048 venture mismatch) → status → decide
settle ─► success → order paid
       └─ false/no answer → status: VERIFY → settle again · SETTLE → order paid
429/1053 (ONGOING_PAYMENT_TRANSITION_PROCESS) on any call → wait a few seconds and retry the same call
```

### 1.4 Non-code prerequisites

- **IP whitelist.** Snapp rejects requests from IPs it does not know ("Access Denied"). Send them the **outgoing IP of the production server that runs the WordPress container**. It should be an Iranian IP, the same one registered with the bank for ZarinPal. Local development machines cannot reach staging, so development uses mocks, and staging end-to-end tests run from the server.
- **returnURL domain.** Tell Snapp the exact origin the callback will POST to (decision D2).
- **UI compliance.** Snapp checks the payment-method UI (logo, title and description lines, mobile layout) in the pre-demo. Production credentials come only after that review.
- **Secrets hygiene.** `snapp/` is untracked and must stay out of git:
  - `snapp/kadochi-stage.txt` contains live staging credentials.
  - The Postman collection contains another merchant's bearer tokens and cookies (`venture: Banimode`).

  Add `snapp/` to `.gitignore`, then move the credentials into the server secret store or `.env`.

## 2. How Kadochi's payments work today (relevant code)

- **Stack.** Headless setup: the Next.js BFF (`front/`) talks to WordPress + WooCommerce + the `plugins/kadochi-core` plugin through the Store API and `kadochi/v1` routes.
- **Single hard-coded gateway.** `KADOCHI_PAYMENT_METHOD_ID` (default `WC_ZPal`, the official ZarinPal plugin) is read in:
  - `front/src/lib/server/env.ts`
  - `kadochi-core.php` `payment_method_id()`
  - `docker-compose*.yml`

  Checkout fails closed when that ID is missing from `cart.payment_methods`.
- **Gateway checks in `kadochi-core.php`:**
  - `validate_store_checkout_order()` rejects any `payment_method` other than the configured one.
  - `checkout_return_url()` rewrites the gateway return to `FRONTEND/checkout/return?order=…`.
  - `redirect_cancelled_gateway_payment()` handles ZarinPal's cancel callback (`woocommerce_api_wc_zpal`).
  - `retry_profile_order_payment()` is the single payment-start endpoint used by first checkout, recovery and profile retries. It has per-order `add_option` locks (`begin_payment_attempt`, `release_payment_attempt`) and redirect capture through `wp_redirect` limited to trusted ZarinPal hosts (`trusted_zarinpal_redirect`). Its structured logs (`payment_log`) are hard-wired to `gateway: zarinpal`.
- **Front: `checkout.server.ts`:**
  - `paymentMethod()` returns one `{ id, title }`.
  - `checkout()` does a PUT draft, then a POST with `payment_method: env.KADOCHI_PAYMENT_METHOD_ID`, plus a ZarinPal-specific `startGatewayPayment` path and a `isTrustedZarinpalRedirect()` check.
  - `zarinpalFailure()` maps errors.
- **Front: other files:**
  - `profile.server.ts` `retryProfileOrderPayment()` allows only ZarinPal redirect hosts.
  - `lib/http/errors.ts` limits `payment.provider` to the literal `"zarinpal"`.
  - `utils/payment-error.ts` holds the ZarinPal messages.
  - `checkout-flow.tsx` `PaymentStep` renders one fixed radio labelled «پرداخت آنلاین».
- **Order result pages** are gateway-agnostic: `/checkout/return` reads the owner-scoped `order_summary`, then redirects to success or failure. Snapp can reuse them unchanged.
- **Money.** The front formats IRR as Toman (`formatIrrAsToman`), and the packaging fee DTOs use `IRR`. The Woo store currency therefore appears to be **IRR**, but the gateway must still convert defensively: IRT × 10.

## 3. Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | Build our own `WC_Payment_Gateway` subclass inside `kadochi-core` (id `kadochi_snapppay`) rather than use a third-party WP plugin. | There is no official Snapp WP plugin to pin by checksum as we do with ZarinPal. We need the headless return, lock, logging and reconciliation conventions already in kadochi-core. The API is small. |
| D2 | The callback lands on the **WordPress origin** at `…/wc-api/kadochi_snapppay` (`woocommerce_api_kadochi_snapppay`). WordPress then `wp_safe_redirect()`s to the frontend `/checkout/return?order=…` or `/checkout/failure?order=…`. | Same trust model as ZarinPal: server-to-server verify and settle happen in PHP next to the order, with no auth cookie needed on a cross-site POST. **The WordPress public host must be the domain whitelisted with Snapp** (confirm, Q1). |
| D3 | Credentials come from env vars only (`SNAPPPAY_*`), not Woo settings fields. The Woo settings screen keeps only enable/disable and title. | Matches the repo's env-driven secret handling (OTP, internal secrets). Keeps secrets out of the DB. |
| D4 | Move from a single payment method to an **ordered allow-list**. `KADOCHI_PAYMENT_METHOD_IDS=WC_ZPal,kadochi_snapppay`; the old `KADOCHI_PAYMENT_METHOD_ID` stays as a fallback for backward compatibility. | Checkout, validation, return-URL and retry code all assume a single ID today. |
| D5 | The eligibility check runs **server-side** inside the checkout state. It is recomputed on every state load and after every coupon change, using the cart total. The gateway's `is_available()` does **not** call Snapp. | `is_available()` runs on every Store API cart fetch, so an HTTP call there would slow every cart request. The doc requires eligibility per amount, which the checkout state satisfies. |
| D6 | Build a fresh `transactionId` for each payment attempt: `KS` + base36 of the order ID + a 2-character attempt suffix, padded or trimmed to ≤ 10 characters with at least one letter. Store it on the order with the payment token. | Order IDs alone would collide on retries (1009). A mapping meta lets the callback find the order. |
| D7 | Implement cancel and update through the **Woo refund flow**: a full refund calls cancel, a partial refund calls update. Woo's refund UI already asks the admin to confirm. | Snapp requires both calls with admin confirmation. Refunds are the natural, audited place for them in Woo. |

## 4. Implementation phases

### Phase 0: Setup (no code)

1. Add `snapp/` to `.gitignore`. Move the staging credentials into the server `.env` and the local `.env` as `SNAPPPAY_*`.
2. Send Snapp the production server's outgoing IP for whitelisting, and the returnURL origin (the WordPress host, D2).
3. Confirm the open questions in §6, especially Q1 (returnURL domain), Q3 (commission codes) and Q4 (revert on FAILED).

### Phase 1: WordPress, the Snapp client and the gateway (`plugins/kadochi-core`)

**New file `includes/class-kadochi-snapppay-client.php`.** A thin HTTP client over `wp_remote_request`:

- `config()` reads the env vars `SNAPPPAY_BASE_URL`, `SNAPPPAY_CLIENT_ID`, `SNAPPPAY_CLIENT_SECRET`, `SNAPPPAY_USERNAME` and `SNAPPPAY_PASSWORD`, plus the optional `SNAPPPAY_TIMEOUT` and `SNAPPPAY_PAYMENT_HOSTS`. It is `null` or unhealthy when any required value is missing, and that feeds the plugin's existing `$health` array and admin notice.
- `access_token()`: OAuth password grant. Cache the token in a transient for `expires_in − 120` s. On a 401, clear the transient and retry once.
- `eligible( int $amount_irr )` returns `{ eligible, title, description }`. Any error gives `eligible=false` and is logged.
- `payment_token( array $payload )`, `verify( $token )`, `settle( $token )`, `status( $token )`, `revert( $token )`, `cancel( $token )`, `update( array $payload )`.
- Decode the envelope into a result object `{ ok, httpStatus, errorCode, data, timedOut }`. Timeouts: 30 s for verify (doc requirement), about 15 s for the rest.
- Retry 429/1053 up to 3 times with 2 s, 4 s and 6 s backoff, inside the request budget.
- Never log the access token, payment token, mobile, credentials or raw bodies. Log only the event, order ID, transactionId, HTTP status, error code and duration, through a generalised `payment_log()` (see below).

**New file `includes/class-kadochi-snapppay-gateway.php`,** `Kadochi_SnappPay_Gateway extends WC_Payment_Gateway`:

- Declare `id = 'kadochi_snapppay'`, `supports = ['products', 'refunds']`, and the method title «پرداخت اقساطی اسنپ‌پی».
- `is_available()`: enabled, client configured, currency is IRR or IRT, and the cart total is inside a coarse configured range (`SNAPPPAY_MIN_IRR` and `SNAPPPAY_MAX_IRR`, which avoids offering it for obvious misses). No network call.
- `process_payment( $order_id )`:
  1. Build the payload (below).
  2. Create and store the transactionId (D6).
  3. Call `payment_token`.
  4. Save these metas: `_kadochi_snapppay_token`, `_kadochi_snapppay_transaction_id`, `_kadochi_snapppay_amount_irr`, and `_kadochi_snapppay_attempts[]`, a short history.
  5. Set the order to `pending` with a note, then return `['result' => 'success', 'redirect' => $paymentPageUrl]`.

  On 1009, regenerate the transactionId once. Map 1051 and auth failures to a configuration error and 1005 to a rejected error. Throw the Woo exception with a short Persian notice that carries a provider tag and code the BFF can parse (mirroring the ZarinPal handling).
- **Payload builder** `build_token_payload( WC_Order $order )`:
  - Converts to IRR with `to_irr()`: IRR is unchanged, IRT is multiplied by 10. It rounds to integers.
  - Sends a single cart (`cartId = order_id`).
  - Each line item becomes `{ id: product_id, name, count: qty, amount: round(line_subtotal / qty), category: primary product_cat name or "gift", commissionType: map or 100 }`.
  - Order fees (packaging and similar), when non-zero, become a synthetic item.
  - `isShipmentIncluded=false, shippingAmount=shipping_total` (ex tax).
  - `isTaxIncluded=false, taxAmount=total_tax` (includes shipping tax).
  - `discountAmount=discount_total`, `externalSourceAmount=0`.
  - `totalAmount` is computed by the formula. **Assert `amount === to_irr(order->get_total())`.** If the difference is only rounding, fold it into the last item amount or `discountAmount`. Otherwise fail closed and log `payload_mismatch`.
  - `mobile = canonical_phone( billing_phone )`, falling back to the customer's account phone.
  - `returnURL = WC()->api_request_url( 'kadochi_snapppay' )`, which must be on the whitelisted domain.
  - `forcedPaymentMethodTypes` is omitted unless `SNAPPPAY_FORCED_METHODS` is set.
- **Callback** `handle_callback()`, hooked to `woocommerce_api_kadochi_snapppay`:
  1. Accept only POST. Read and sanitise `transactionId`, `state` and `amount`. Find the order by `_kadochi_snapppay_transaction_id` meta (HPOS-safe `wc_get_orders` meta query). If the order is not found, redirect to `/checkout/failure`.
  2. If the order is already paid, redirect to the return page. This makes the handler idempotent against repeated callbacks.
  3. Take the per-order finalisation lock: `add_option('kadochi_snapppay_finalize_{order}')`, stale after 120 s. If the lock is held, redirect to the return page, which shows the pending or unknown state.
  4. `state !== 'OK'`: mark the order `failed` with a note, release the payment-attempt lock, optionally revert best-effort (Q4, behind `SNAPPPAY_REVERT_ON_FAILED`), then redirect to failure.
  5. `state === 'OK'`: check that `amount` equals the stored `_kadochi_snapppay_amount_irr`; on a mismatch, log and go to reconciliation instead of verifying blindly. Then run `finalize( $order )` with the §1.3 state machine. On `SETTLE`, call `$order->payment_complete( $transactionId )` and store `_kadochi_snapppay_status=SETTLE`. On a definitive failure, mark the order failed. On an unknown result, leave it `pending` with `_kadochi_snapppay_status=UNKNOWN` for the reconciler.
  6. Before verify, if the order can no longer be fulfilled (it was cancelled or expired meanwhile, or is paid through another attempt), revert instead of verifying.
  7. Release the lock and `wp_safe_redirect()` to the frontend return URL. `/checkout/return` then shows success or failure from `order_summary`.
- `process_refund( $order_id, $amount, $reason )`:
  - A full refund calls `cancel`.
  - A partial refund calls `update` with the remaining cart, rebuilt from the order minus the refunded items and quantities through the same payload builder, with `amount` ≤ the original.
  - Error 1078 returns a `WP_Error` that tells the admin to do a full cancel. 1042 means the amount is too high.
  - Add an order note on every outcome.
- Admin: add an order meta box line showing the Snapp transactionId, status and last sync, plus a manual "sync status" action (it calls `status` and runs the same finalise logic).

**Changes to `kadochi-core.php`:**

- Register the gateway through `woocommerce_payment_gateways` and require both new includes.
- Replace `payment_method_id()` with `payment_method_ids()`, which parses the allow-list with the D4 fallback, and `is_allowed_payment_method( $id )`. Update these callers:
  - `validate_store_checkout_order()` accepts any allowed ID.
  - `checkout_return_url()` applies to any allowed ID.
  - `redirect_cancelled_gateway_payment()` stays ZarinPal-only (it is hooked only to `wc_zpal`).
  - `retry_profile_order_payment()` resolves the gateway from `$order->get_payment_method()` (it must be allowed). ZarinPal keeps its special `Send_to_ZarinPal_Gateway` path. Other gateways call `process_payment()`, and the returned redirect is stored in the attempt lock (`redirectUrl`) so the existing recovery path in `begin_payment_attempt()` works unchanged.
- Generalise `trusted_zarinpal_redirect()` into `trusted_gateway_redirect( $url, $gateway_id )`:
  - ZarinPal: `payment.zarinpal.com` and `sandbox.zarinpal.com`.
  - Snapp: the host of `SNAPPPAY_BASE_URL` plus the hosts in `SNAPPPAY_PAYMENT_HOSTS` (production page host is unknown, Q2), HTTPS only.
- Generalise `payment_log( $event, $context, $gateway = 'zarinpal' )` so the source becomes `kadochi-{gateway}`.
- **New REST route** `GET kadochi/v1/checkout/payment-options`, authenticated, reading the current session cart. It returns `{ items: [{ id, title, description, eligible }] }`:
  - ZarinPal always appears.
  - Snapp appears only when the gateway is available **and** `eligible(to_irr(cart total))` is true, using Snapp's `title_message` and `description` verbatim.
  - Uses a short in-request cache only: no persistent cache, because the doc demands dynamic values.
- **Reconciliation cron** `kadochi_snapppay_reconcile`, every 5 minutes, reusing the existing `cron_schedules` pattern:
  - Target: orders with payment method `kadochi_snapppay`, status `pending` or `failed`, a stored token, and `_kadochi_snapppay_status` not final, from 3 minutes to 48 hours old.
  - Action: call `status`, then settle if `VERIFY`, verify if `PENDING` and the callback said OK, complete if `SETTLE`, fail if `REVERT` or `CANCEL`.
  - Covers customers who close the tab after paying and callbacks that time out mid-verify or mid-settle.
  - Let `expire_stale_draft_orders()` and the draft-expiry logic skip orders that have a live Snapp token.
- Leave `notify_paid_order()` and the order-status notifications unchanged: they fire on `payment_complete`.

**Tests** (`plugins/kadochi-core/tests`, following the stubs in `bootstrap.php`):

- Payload builder: amount identities, IRT→IRR conversion, rounding, fee line, mismatch fail-closed.
- transactionId: format and uniqueness per attempt.
- Callback: OK then verify then settle, OK with verify timeout (status VERIFY) then settle, OK with PENDING re-verify, FAILED, amount mismatch, duplicate callback when already paid, lock held.
- Refund: full refund to cancel, partial refund to update, 1078.
- `payment_method_ids()` parsing and the fallback.
- `trusted_gateway_redirect()`.

### Phase 2: Next.js BFF and UI (`front/`)

**Config**

- `lib/server/env.ts`: add `KADOCHI_PAYMENT_METHOD_IDS` as a comma list, falling back to `[KADOCHI_PAYMENT_METHOD_ID]`, plus `SNAPPPAY_PAYMENT_HOSTS` for the redirect allow-list.
- Update `docker-compose.yml`, `docker-compose.local.yml` and `front/.env.production.example` to match.

**Schema and types** (`features/checkout/schema/checkout.ts`, `types.ts`):

- `checkoutStateSchema.paymentMethod` becomes `paymentMethods: [{ id, title, description?, provider: "zarinpal" | "snapppay" }]`, with at least one entry.
- `submitCheckoutSchema` gains `paymentMethodId`.
- Update the checkout tests.

**Checkout service** (`services/checkout.server.ts`):

- `paymentMethod()` becomes `paymentMethods()`. It intersects the allow-list with `cart.paymentMethodIds`, adds the Snapp title and description from `GET /kadochi/v1/checkout/payment-options`, and drops Snapp when it is not eligible or the call fails. It still fails closed if nothing remains.
- `checkout()`:
  - Validate that `parsed.paymentMethodId` is in the currently offered list. Re-run eligibility for Snapp right before the POST, because the amount may have changed; if Snapp is no longer eligible, return a validation error asking the customer to choose again.
  - Send `payment_method: parsed.paymentMethodId` in both the PUT and the POST.
  - The ZarinPal-only `startGatewayPayment` path stays gated on `WC_ZPal`. For Snapp, the Store API POST already returns `paymentPageUrl` as `payment_result.redirect_url`; validate it with the new `isTrustedGatewayRedirect(url, methodId)`.
  - Recovery paths (a 400 after materialisation, retryable errors) keep calling the retry endpoint, which now supports Snapp through the stored redirect.
- Generalise `zarinpalFailure()` into `gatewayFailure()` with a Snapp branch. It parses our provider tag and code from the Woo notice:
  - 1000 is `temporarily_unavailable` (retryable)
  - 1005 is `rejected` (invalid mobile)
  - 1051 or auth errors are `configuration`

**Other front files**

- `profile/services/profile.server.ts`: the retry-payment host check becomes `isTrustedGatewayRedirect`, shared from `lib/payments/redirect-hosts.ts`.
- `lib/http/errors.ts`: `payment.provider` becomes `z.enum(["zarinpal", "snapppay"])`.
- `utils/payment-error.ts`: add Persian Snapp messages. Show Snapp's own `errorData.message` only for 1048, «امکان استفاده از سرویس اعتباری را ندارید…», because it is customer-safe; otherwise use category messages.

**UI** (`checkout-flow.tsx` `PaymentStep`), following `Snapp Pay - Payment Method - Style Guide.pdf`:

- `RadioGroup` becomes controlled over `state.paymentMethods`, with the selection lifted into the checkout form state. ZarinPal is the default.
- Snapp row: radio, Snapp! Pay logo (40×40 on desktop/tablet, 32×32 on mobile), then line 1 `title` and line 2 `description` from eligibility, **verbatim**.
  - Desktop gap 16px, mobile gap 12px.
  - `flex-row`, right-aligned for RTL, `align-items: flex-start`.
  - On mobile, allow the description to wrap to a second line, as in the guide.
- Add assets `front/public/images/payment/snapppay.svg`, copied from `snapp/extracted_ordinary_docs/SnappPay Logo/…/Round/40x40.svg`, and a ZarinPal logo if desired for symmetry.
- After coupon apply or remove, the refreshed state recomputes eligibility. If the selected method disappears, fall back to the first available one and show a short inline note.

**Tests (vitest):** state mapping with and without Snapp, submit with each method, trusted-host checks, Snapp error mapping, and the PaymentStep rendering and selection fallback.

### Phase 3: Product-page messaging (optional, recommended by Snapp)

- Snapp's on-site messaging kit (`SnappPay On-site messaging Guidelines/…PDP…`) shows a small block on the product page, for example «هر قسط با اسنپ‌پی: X تومان — ۴ قسط ماهانه، بدون سود، چک و ضامن».
- The text must come from `eligible` for the product price: public route `GET kadochi/v1/products/{id}/snapppay-offer`, rendered with the same title and description rule. Show nothing when not eligible.
- This needs a short server-side cache per amount (60–300 s) to protect Snapp and our API under catalogue traffic, and Snapp must confirm that is acceptable (Q5).

### Phase 4: Docs, rollout and the Snapp review

1. Update the docs:
   - `README.md`: env vars, IP whitelist note.
   - `docs/INTEGRATION.md`: gateway list, callback route, reconciliation.
   - `front/src/features/checkout/CONTRACT.md`: `paymentMethods[]`, `paymentMethodId`.
   - `.env.example`
2. Deploy to staging with `KADOCHI_PAYMENT_METHOD_IDS=WC_ZPal,kadochi_snapppay` and staging `SNAPPPAY_*`, then run the staging scenarios (§5).
3. Hold the Snapp pre-demo and demo. Show the UI on mobile and desktop, the full flow, refund-driven cancel and update, and the logs.
4. Receive production credentials. Swap the env values, whitelist the production IP, and leave the feature off (not in the allow-list) until a smoke test passes, then enable it.

## 5. Staging test checklist

Staging bank page notes from the doc:

- The browser may show a "send anyway" resubmission prompt; accept it.
- On the sandbox bank screen, enter any card number and keep the default options.

Scenarios:

- [ ] Amount below 40,000 Toman or above 10M Toman: the Snapp option is hidden. Inside the range: shown with Snapp's exact title and description.
- [ ] Applying or removing a coupon re-queries eligibility and the texts update.
- [ ] Happy path: token, Snapp page, OK callback, verify, settle, order `processing`, success page, notification.
- [ ] Customer cancels on the Snapp page (FAILED): order `failed`, failure page, retry from the profile creates a new transactionId and token (no 1009).
- [ ] Callback POSTed twice: only one verify call in the logs.
- [ ] Verify timeout simulated (mock or firewall): status VERIFY, then settle, then paid.
- [ ] Tab closed after the bank step: the reconciler finalises within about 5 minutes.
- [ ] Full refund in Woo admin: cancel succeeds, and the Snapp status is CANCEL.
- [ ] Partial refund of one item: update succeeds with a lower amount. The update is rejected if it would raise the amount.
- [ ] Two tabs with the same cart: each gets its own transactionId, and paying both results in two separate settles, as the doc warns. Confirm our operation lock prevents this for a single checkout.
- [ ] Logs contain no tokens, mobile numbers or credentials.

## 6. Open questions for Snapp or the team

1. **Q1: returnURL domain.** Which origin do we register with Snapp: the WordPress host (the plan's D2) or the storefront host? If Snapp only accepts the storefront domain, add a thin Next.js route `POST /api/payments/snapppay/callback` that forwards the form, HMAC-signed with `KADOCHI_INTERNAL_API_SECRET`, to the WordPress handler and relays the redirect.
2. **Q2: production payment page host,** for the redirect allow-list (`SNAPPPAY_PAYMENT_HOSTS`).
3. **Q3: commission types.** Does our contract map product categories to specific `commissionType` codes, or is it `100` everywhere?
4. **Q4: revert on FAILED.** Should we call revert when the callback state is `FAILED`? The callback section says yes; the revert section says it is not needed unless Snapp instructs us.
5. **Q5: caching eligibility.** Is short caching acceptable for PDP messaging (Phase 3)? Which payment types (`INSTALLMENT`, `POSTPAID`, `FINANCING`) are enabled for Kadochi, and do we want `forcedPaymentMethodTypes`?
6. **Q6: `externalSourceAmount`.** Kadochi has no wallet or gift-card source today, so it is always 0. Confirm that nothing like that is planned before launch.
7. **Q7: `venture` header.** The Postman collection sends a `venture` header on verify, settle, revert, status and cancel (value from another merchant); the PDF never mentions it. Ask whether Kadochi has a venture value we must send.

## 7. File touch list (for the implementation PR)

```
.gitignore                                                   + snapp/
docker-compose.yml, docker-compose.local.yml                 SNAPPPAY_* env, KADOCHI_PAYMENT_METHOD_IDS
.env.example, front/.env.production.example                  same
plugins/kadochi-core/kadochi-core.php                         gateway registration, allow-list, redirect trust, logs, payment-options route, cron
plugins/kadochi-core/includes/class-kadochi-snapppay-client.php   new
plugins/kadochi-core/includes/class-kadochi-snapppay-gateway.php  new
plugins/kadochi-core/tests/test-snapppay.php                  new
front/src/lib/server/env.ts                                   allow-list + hosts
front/src/lib/payments/redirect-hosts.ts                      new shared trusted-host check
front/src/lib/http/errors.ts                                  provider enum
front/src/features/checkout/schema/checkout.ts (+test)        paymentMethods[], paymentMethodId
front/src/features/checkout/services/checkout.server.ts (+test)   multi-method, Snapp redirect, gatewayFailure
front/src/features/checkout/utils/payment-error.ts (+test)    Snapp messages
front/src/features/checkout/components/checkout-flow.tsx      PaymentStep per style guide
front/src/features/profile/services/profile.server.ts         generic trusted redirect
front/public/images/payment/snapppay.svg                      new asset
README.md, docs/INTEGRATION.md, front/src/features/checkout/CONTRACT.md   docs
```
