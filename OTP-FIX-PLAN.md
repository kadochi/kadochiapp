# OTP Production Reliability Fix Plan

## Known issues

- Production sends the OTP SMS but the UI reports that something went wrong.
- Retrying immediately shows a rate-limit error.

## Current findings

The most likely primary cause is a timeout race:

- WordPress allows the SMS relay request 8 seconds.
- The Next.js BFF also allows the complete WordPress request 8 seconds.
- The BFF can therefore time out while WordPress is still completing the SMS request and storing the OTP challenge.
- The SMS reaches the user, but the browser receives a failure.
- An immediate retry then encounters WordPress's 60-second resend cooldown, which the BFF reduces to the generic `rate_limited` error.

There is also a relay-contract risk. WordPress currently accepts only a top-level string `code` in the relay response. A numeric code or a documented nested response can cause WordPress to report failure even after the relay has sent the SMS.

## Implementation plan

### 1. Fix timeout ordering

- Keep the outbound WordPress-to-SMS-provider timeout at 8 seconds.
- Give the OTP-start call from Next.js to WordPress a larger timeout, around 12–15 seconds.
- Ensure every outer timeout exceeds its inner dependency timeout plus processing and network overhead.
- Apply the longer timeout only to OTP start unless evidence shows other WordPress operations need it.

Primary file:

- `front/src/features/auth/services/auth.server.ts`

### 2. Make OTP start retry-safe

- Store `codeLength`, `expiresAt`, and `retryAt` with the OTP challenge.
- When another start request arrives during the resend cooldown and a valid challenge already exists:
  - do not send another SMS;
  - return the existing challenge metadata as HTTP 200;
  - include the remaining expiry and retry delay.
- Return HTTP 429 only when the real hourly phone/IP request limit has been reached.
- Do not reveal the OTP or its digest in any response.

This makes recovery safe when the SMS was sent but the original HTTP response was lost or timed out.

Primary file:

- `plugins/kadochi-core/kadochi-core.php`

### 3. Harden the SMS relay contract

- Confirm the production relay's sanitized response shape and normal response latency.
- Accept the OTP as either a string or number.
- Support only explicitly documented response locations, such as:
  - `code`
  - `data.code`
  - `data.otp`
- Normalize Persian and Arabic digits before validation.
- Require an exact 4–6 digit value.
- Avoid searching arbitrary response text for digits, since unrelated provider identifiers could be mistaken for an OTP.
- Log the HTTP status, duration, response shape, and failure category without logging the phone number, OTP, credentials, or full provider body.

Primary file:

- `plugins/kadochi-core/kadochi-core.php`

### 4. Preserve WordPress OTP errors through the BFF

- Parse WordPress REST error bodies before converting failures to the shared API error model.
- Preserve distinctions between:
  - resend cooldown;
  - hourly phone/IP limit;
  - provider timeout or network failure;
  - invalid provider response;
  - unavailable OTP configuration.
- Add an optional `retryAfter` field to the shared API error schema.
- Keep unknown upstream errors safely mapped to the existing generic failure types.

Primary files:

- `front/src/lib/http/upstream.ts`
- `front/src/lib/http/errors.ts`
- `front/src/features/auth/services/auth.server.ts`

### 5. Improve client retry behavior

- Use server-provided `retryAfter` values for countdowns instead of assuming a fixed duration after an error.
- Disable resend while the cooldown is active.
- Show the "too many requests" message only for the actual hourly limit.
- If an immediate retry recovers an existing challenge with HTTP 200, proceed to the OTP-entry screen normally.
- Keep provider/network failures separate from rate-limit messaging.

Primary files:

- `front/src/features/auth/components/phone-login-form.tsx`
- `front/src/features/auth/components/otp-verification-form.tsx`

### 6. Add observability

- Carry the request ID across browser BFF, WordPress, and relay-related logs where possible.
- Record safe events for:
  - OTP start received;
  - relay completed, timed out, or returned an invalid contract;
  - challenge stored;
  - existing challenge recovered;
  - cooldown encountered;
  - hourly limit reached.
- Never log raw phone numbers, OTP values, OTP digests, authorization headers, or provider credentials.

## Test plan

### Automated coverage

- A provider response completing just under 8 seconds reaches the browser successfully.
- A lost or timed-out first response after successful SMS delivery is recovered by an immediate retry.
- Retry recovery does not send a second SMS.
- An immediate retry for an active challenge returns challenge metadata rather than a rate-limit error.
- The real hourly limit still returns HTTP 429 and the correct user-facing message.
- Top-level string and numeric OTP codes are accepted.
- Each documented nested OTP response is accepted.
- Missing, malformed, oversized, or unrelated numeric provider values are rejected.
- `retryAfter`, expiry, and code length are returned and mapped correctly.
- OTP verification succeeds after challenge recovery.

### Production smoke test

1. Send an OTP to a controlled production phone.
2. Confirm that the SMS arrives and the UI advances to OTP entry without an error.
3. Retry the start request during cooldown and confirm that no second SMS is sent and the existing challenge is recovered.
4. Verify the received OTP successfully.
5. Exercise the real hourly limit with a controlled test identity and confirm the specific rate-limit message.
6. Review sanitized correlated logs for timing and error classification.

## Acceptance criteria

- A successfully sent and stored OTP never produces a generic failure solely because the BFF timed out first.
- Retrying a valid in-flight challenge is idempotent and does not send a duplicate SMS.
- Cooldown and hourly rate limiting are represented as different conditions.
- The UI displays a rate-limit message only for the real hourly limit.
- The relay response is validated against an explicit, tested contract.
- Logs are sufficient to identify which layer failed without exposing sensitive authentication data.
