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

Copy the provided template and fill in your secrets:

```bash
cp front/.env.example front/.env.local
```

The defaults in `.env.example` already point `WP_BASE_URL` and `WOO_BASE_URL` to `http://localhost:8080`, which is correct when running Next.js **directly on the host** with `npm run dev`.

> **Docker networking note:** When Next.js runs _inside a container_ (via `docker-compose.local.yml`), `localhost` resolves to the container itself — it can never reach the `wordpress` service. The compose file automatically overrides `WP_BASE_URL` and `WOO_BASE_URL` to `http://wordpress` (the Docker service name) at startup, regardless of what is in `front/.env.local`. You do not need to change those two values manually.

Key variables you must fill in after the WordPress setup (Step 4):

| Variable | Where to find it |
| --- | --- |
| `WP_APP_USER` / `WP_APP_PASS` | WP admin → Users → Profile → Application Passwords |
| `WOO_CONSUMER_KEY` / `WOO_CONSUMER_SECRET` | WooCommerce → Settings → Advanced → REST API → Add key |
| `REDIS_URL` | OTP login requires Redis — see hot-reload section below |

> **Note:** WooCommerce keys and the WordPress application password are created inside WordPress after the first setup (see Step 4).

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

The `nextjs` service in `docker-compose.local.yml` builds and runs a **production** Next.js image (via `front/Dockerfile`). That image is a static build — **file changes on disk have no effect until you rebuild**.

For day-to-day frontend work, run the backend services in Docker and start Next.js directly on your host machine:

```bash
# Terminal 1 — backend only (WordPress, MySQL, Redis)
docker compose -f docker-compose.local.yml up -d mysql redis wordpress

# Terminal 2 — frontend dev server with hot reload
cd front
npm install
npm run dev
```

The app will be available at **http://localhost:3000** and Next.js will automatically reload whenever you save a file — no rebuild needed.

**OTP / Redis:** Phone login stores OTP codes and rate limits in Redis. When Next.js runs in Docker, `docker-compose.local.yml` sets `REDIS_URL=redis://redis:6379` automatically. When running `npm run dev` on the host, start Redis via Docker (`docker compose -f docker-compose.local.yml up -d redis`) and set `REDIS_URL=redis://localhost:6379` in `front/.env.local` — local compose exposes Redis on port 6379 for this workflow.

### Do I need to rebuild after a code change?

| How you run the frontend | After a code change |
| --- | --- |
| `npm run dev` on host (recommended) | No — hot reload is automatic |
| `docker compose … up -d` (full stack in Docker) | **Yes** — run `docker compose -f docker-compose.local.yml up -d --build nextjs` |

### Applying environment variable changes

Next.js bakes most env vars at **build time** (anything without `NEXT_PUBLIC_` prefix that is used in server components / API routes is read at runtime, but `NEXT_PUBLIC_` vars are inlined at build time). When you change `front/.env.local`:

- **`npm run dev`**: restart the dev server (`Ctrl+C`, `npm run dev`).
- **Docker**: rebuild the container: `docker compose -f docker-compose.local.yml up -d --build nextjs`.

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

WordPress mounts the theme from `wordpress/theme/` into the container:

```yaml
./wordpress/theme:/var/www/html/wp-content/themes/kadochi
```

Put theme files under `wordpress/theme/` and activate **Kadochi** under **Appearance → Themes** in wp-admin. PHP upload limits and the WordPress image build live in `wordpress/` (`Dockerfile`, `php.ini`).

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
- If running `npm run dev` on the host: check that `WP_BASE_URL` and `WOO_BASE_URL` in `front/.env.local` are `http://localhost:8080`.
- If running the full stack in Docker: the compose file overrides those to `http://wordpress` automatically. Check that the `wordpress` container is healthy and on the `web` network.
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
