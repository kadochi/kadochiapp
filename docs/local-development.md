# Local Development Guide

This guide walks you through running the Kadochi stack on your machine using Docker Compose. It uses `docker-compose.local.yml`, which exposes services on localhost without Traefik or HTTPS.

---

## Prerequisites

- **Docker Desktop** (macOS / Windows) or **Docker Engine + Docker Compose** (Linux)
- **Git**
- **Node.js 20+** (only if you run the Next.js app outside Docker for hot reload)

Verify Docker is available:

```bash
docker --version
docker compose version
```

---

## Architecture (Local)

| Service   | URL                           | Notes                          |
| --------- | ----------------------------- | ------------------------------ |
| Next.js   | http://localhost:3000         | Frontend                       |
| WordPress | http://localhost:8080         | WooCommerce / REST API backend |
| MySQL     | `mysql:3306` (Docker network) | Not exposed to the host        |
| Redis     | `redis:6379` (Docker network) | Not exposed to the host        |

Unlike production (`docker-compose.yml`), the local compose file does **not** include Traefik or Let's Encrypt.

---

## Step 1 — Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/kadochi.git
cd kadochi
```

---

## Step 2 — Configure Frontend Environment

Create `front/.env.local` with values pointed at your local WordPress instance:

```bash
# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000
COOKIE_DOMAIN=

# WordPress / WooCommerce (local Docker)
WP_BASE_URL=http://localhost:8080
WOO_BASE_URL=http://localhost:8080

# WordPress application password (create after WP setup)
WP_APP_USER=api-kadochi
WP_APP_PASS=your-app-password

# WooCommerce REST API keys (create after WooCommerce setup)
WOO_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WOO_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Auth / security (use any random strings locally)
KADOCHI_JWT_SECRET=local-dev-jwt-secret
CSRF_SECRET=local-dev-csrf-secret
REVALIDATE_SECRET=local-dev-revalidate-secret
ALLOWED_ORIGINS=http://localhost:3000

# Payment (Zarinpal sandbox)
ZARINPAL_MERCHANT_ID=your-sandbox-merchant-id
ZARINPAL_MODE=sandbox
ZARINPAL_CALLBACK_URL=/checkout/zp-callback

# SMS / OTP (optional for local testing)
MELIPAYAMAK_OTP_URL=
SMS_USERNAME=
SMS_PASSWORD=
OTP_CODE_TTL_SEC=180
OTP_ATTEMPT_RATE_PER_HOUR=30

# Analytics (optional)
NEXT_PUBLIC_GA_ID=
```

> **Note:** WooCommerce keys and the WordPress application password are created inside WordPress after the first setup (see Step 5).

If product images from WordPress do not load, add a local hostname to `front/next.config.ts` under `images.remotePatterns`:

```ts
{ protocol: "http", hostname: "localhost", port: "8080", pathname: "/**" },
```

---

## Step 3 — Start the Stack

From the repository root:

```bash
docker compose -f docker-compose.local.yml up -d --build
```

Docker will:

1. Build the Next.js image from `./front`
2. Pull MySQL, Redis, and WordPress images
3. Start all containers on the `web` network

Check that everything is running:

```bash
docker compose -f docker-compose.local.yml ps
```

Follow logs if needed:

```bash
docker compose -f docker-compose.local.yml logs -f
```

---

## Step 4 — Complete WordPress Setup

1. Open **http://localhost:8080** in your browser.
2. Run the WordPress installation wizard (language, site title, admin account).
3. Go to **Settings → General** and set both URLs to:
   - **WordPress Address (URL):** `http://localhost:8080`
   - **Site Address (URL):** `http://localhost:8080`
4. Install and activate **WooCommerce**.
5. Create REST API credentials:
   - **WooCommerce → Settings → Advanced → REST API → Add key**
   - Permissions: **Read/Write**
   - Copy the consumer key and secret into `front/.env.local`
6. Create a WordPress application password for server-side API calls:
   - **Users → Profile → Application Passwords**
   - Copy the password into `WP_APP_PASS` in `front/.env.local`

---

## Step 5 — Verify Everything

| URL                            | Expected result         |
| ------------------------------ | ----------------------- |
| http://localhost:3000          | Next.js frontend        |
| http://localhost:8080          | WordPress admin / site  |
| http://localhost:8080/wp-json/ | WordPress REST API JSON |

Restart the Next.js service after changing environment variables:

```bash
docker compose -f docker-compose.local.yml restart nextjs
```

---

## Recommended Workflow — Frontend with Hot Reload

The `nextjs` service in `docker-compose.local.yml` builds and runs a **production** Next.js image (via `front/Dockerfile`). That is useful for integration testing, but it does not provide hot reload.

For day-to-day frontend work, run backend services in Docker and start Next.js on the host:

```bash
# Terminal 1 — backend only
docker compose -f docker-compose.local.yml up -d mysql redis wordpress

# Terminal 2 — frontend dev server
cd front
npm install
npm run dev
```

The app will be available at **http://localhost:3000** with live reload, using the same `front/.env.local` file.

---

## Default Credentials (Local Compose)

These values come from `docker-compose.local.yml`. They are fine for local use only — never reuse them in production.

| Setting             | Value            |
| ------------------- | ---------------- |
| MySQL database      | `wordpress`      |
| MySQL user          | `wordpress`      |
| MySQL password      | `strongpassword` |
| MySQL root password | `rootpassword`   |

---

## Custom Theme (Optional)

WordPress mounts a local theme directory into the container:

```yaml
./theme:/var/www/html/wp-content/themes/kadochi
```

Create a `theme/` folder at the repo root if you are developing the WordPress theme locally, then activate **Kadochi** under **Appearance → Themes** in wp-admin.

---

## Useful Commands

```bash
# Start the stack
docker compose -f docker-compose.local.yml up -d

# Rebuild after Dockerfile or dependency changes
docker compose -f docker-compose.local.yml up -d --build

# View running containers
docker compose -f docker-compose.local.yml ps

# Logs for a specific service
docker compose -f docker-compose.local.yml logs -f nextjs
docker compose -f docker-compose.local.yml logs -f wordpress
docker compose -f docker-compose.local.yml logs -f mysql

# Restart one service
docker compose -f docker-compose.local.yml restart nextjs

# Stop the stack
docker compose -f docker-compose.local.yml down

# Stop and remove volumes (⚠️ deletes database data)
docker compose -f docker-compose.local.yml down -v
```

---

## Troubleshooting

**Port already in use (`3000` or `8080`)**

- Stop the conflicting process, or change the host port mapping in `docker-compose.local.yml`, for example `"3001:3000"`.

**Next.js cannot reach WordPress**

- Confirm WordPress is up: `docker compose -f docker-compose.local.yml ps wordpress`
- Check `WP_BASE_URL` and `WOO_BASE_URL` in `front/.env.local` are `http://localhost:8080`
- Ensure `ALLOWED_ORIGINS` includes `http://localhost:3000`

**WordPress redirect loop or wrong URL**

- Fix URLs under **Settings → General** to `http://localhost:8080`
- Or via WP-CLI:
  ```bash
  docker exec kadochi-wordpress wp option update siteurl http://localhost:8080 --allow-root
  docker exec kadochi-wordpress wp option update home http://localhost:8080 --allow-root
  ```

**Database connection errors in WordPress**

- Wait for MySQL to become healthy, then restart WordPress:
  ```bash
  docker compose -f docker-compose.local.yml restart wordpress
  ```
- Verify credentials in `docker-compose.local.yml` match between the `mysql` and `wordpress` services.

**Next.js container fails to build**

- Inspect build output:
  ```bash
  docker compose -f docker-compose.local.yml logs nextjs
  ```
- Test the build on the host:
  ```bash
  cd front && npm ci && npm run build
  ```

**Empty product list or API errors**

- Confirm WooCommerce REST keys and `WP_APP_PASS` are set in `front/.env.local`
- Restart Next.js after updating env vars

---

## Next Steps

When you are ready to deploy, follow [Production Deployment Guide](./production-deployment.md).
