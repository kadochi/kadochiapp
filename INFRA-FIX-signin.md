# Infra fix: production sign-in "verified but not logged in"

## Symptom
User requests OTP → verifies → sees success → is sent to `/profile` → page shows
**"وارد حساب کاربری شوید"** ("please sign in") as if never logged in. Intermittent
(HTTPS visitors are fine; HTTP visitors are broken).

## Root cause
Commit `2d8c532` removed the in-compose Traefik that used to force **HTTP→HTTPS** and set
`X-Forwarded-Proto`. It was never re-added at the new edge, so `http://kadochi.com` still
returns `200` (no redirect). A visitor on plain HTTP gets a session cookie marked `Secure`
(from the non-localhost fallback in `resolveCookieSecure`), and a browser on an HTTP page
**silently discards a Secure cookie** → `kadochi_session` never persists → "please sign in".

## The fix — do these in order

### 1. Force HTTP→HTTPS at the edge (REQUIRED, do this FIRST)
In the **MizbanCloud** panel: enable "always use HTTPS" / force-HTTPS redirect for
`kadochi.com`. Confirm with:
```
curl -sI http://kadochi.com   # must return 301/308 to https://kadochi.com
```
Once every browser is on HTTPS, sign-in works even with no other change.

### 2. Forward the browser scheme to the container
Ensure the origin proxy (host Traefik/Nginx on the external `web` network) sends
`X-Forwarded-Proto: https`:
- **Traefik**: sets it by default on the TLS (`websecure`) entrypoint — confirm that
  entrypoint is used.
- **Nginx**: add to the proxy block:
  ```
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Host $host;
  ```

### 3. Deploy the repo config changes (ONLY AFTER step 1 is live)
Already applied in this repo (redeploy the `nextjs` container to pick them up):
- `docker-compose.yml` → `COOKIE_SECURE: "true"`, `COOKIE_DOMAIN: ""`
- `front/.env.production` → `COOKIE_SECURE=true`
- `front/src/lib/auth/session.ts` → `resolveCookieDomain` leading-dot fix

> ⚠️ **Ordering matters.** `COOKIE_SECURE=true` makes the cookie always `Secure`. If deployed
> while HTTP still serves `200`, HTTP visitors' browsers will reject the cookie — including the
> subset that works today. Land the step 1 redirect first.

## Verify after rollout
1. `curl -sI http://kadochi.com` → `301/308` to `https://`.
2. Fresh sign-in starting from bare `kadochi.com`; `/profile` shows the account;
   `GET /api/auth/session` returns a non-null `session`.
3. DevTools → the `POST /api/auth/otp/verify` response `Set-Cookie` is
   `HttpOnly; Secure; SameSite=Lax; Path=/` (no `Domain`), stored under `kadochi.com`, and
   re-sent on the immediate `/api/auth/session` GET.
4. Local dev over `http://localhost:3000` still works (`docker-compose.local.yml` keeps
   `COOKIE_SECURE=false`).
