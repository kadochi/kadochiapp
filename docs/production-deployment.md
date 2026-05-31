# Production Deployment Guide

This guide walks you through deploying Kadochi to a production server with HTTPS via Let's Encrypt, using Docker Compose and Traefik as the reverse proxy.

---

## Prerequisites

- A server running **Ubuntu 22.04+** (or any modern Linux distro)
- A public **IPv4 address** on the server
- The domain **kadochi.com** registered and accessible
- **SSH access** to the server
- **Git** installed on the server

---

## Step 1 — Point DNS to Your Server

At your domain registrar or DNS provider, create the following **A records** pointing to your server's public IP:

| Type | Host  | Value            |
| ---- | ----- | ---------------- |
| A    | `@`   | `YOUR_SERVER_IP` |
| A    | `www` | `YOUR_SERVER_IP` |
| A    | `api` | `YOUR_SERVER_IP` |

> DNS propagation can take a few minutes up to 24 hours. You can verify with:
>
> ```bash
> dig kadochi.com +short
> dig api.kadochi.com +short
> ```

---

## Step 2 — Install Docker on the Server

SSH into your server and run:

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Add your user to the docker group (so you don't need sudo)
sudo usermod -aG docker $USER

# Apply group change without logging out
newgrp docker

# Verify
docker --version
docker compose version
```

---

## Step 3 — Open Firewall Ports

Traefik and Let's Encrypt require ports 80 and 443 to be reachable from the internet.

```bash
# UFW (Ubuntu firewall)
sudo ufw allow 22      # SSH — keep this open!
sudo ufw allow 80      # HTTP
sudo ufw allow 443     # HTTPS
sudo ufw enable
sudo ufw status
```

If you're using a cloud provider (AWS, Hetzner, DigitalOcean, etc.), also open ports **80** and **443** in the cloud firewall / security group panel.

---

## Step 4 — Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/kadochi.git
cd kadochi
```

---

## Step 5 — Prepare the Let's Encrypt Storage File

Traefik requires the `acme.json` file to exist with strict permissions before it starts:

```bash
mkdir -p letsencrypt
touch letsencrypt/acme.json
chmod 600 letsencrypt/acme.json
```

> **Important:** If this file has permissions wider than `600`, Traefik will refuse to start.

---

## Step 6 — Configure Frontend Environment & Secrets

Copy the provided template and fill in all values:

```bash
cp front/.env.example front/.env.production
```

Edit `front/.env.production` and set at minimum:

| Variable | Value |
| --- | --- |
| `WP_APP_USER` / `WP_APP_PASS` | WordPress Application Password (created in Step 8) |
| `WOO_CONSUMER_KEY` / `WOO_CONSUMER_SECRET` | WooCommerce REST API keys (created in Step 8) |
| `KADOCHI_JWT_SECRET` | Strong random string (`openssl rand -hex 32`) |
| `CSRF_SECRET` | Strong random string |
| `ZARINPAL_MERCHANT_ID` | Your live Zarinpal merchant ID |
| `ZARINPAL_MODE` | `production` |
| `ALLOWED_ORIGINS` | `https://kadochi.com,https://www.kadochi.com` |

> **Docker networking:** `WP_BASE_URL`, `WOO_BASE_URL`, and `NEXT_PUBLIC_SITE_URL` are automatically overridden by `docker-compose.yml`. General WordPress/store requests use Docker-internal `http://wordpress`, while authenticated Woo REST v3 requests use `https://api.kadochi.com` because WooCommerce consumer-key Basic Auth must be made over HTTPS in production. You do not need to set those in `front/.env.production`.

Also review and change the database passwords in `docker-compose.yml`:

```yaml
# MySQL credentials
MYSQL_PASSWORD: strongpassword        # change this
MYSQL_ROOT_PASSWORD: rootpassword     # change this

# WordPress DB password (must match MYSQL_PASSWORD above)
WORDPRESS_DB_PASSWORD: strongpassword # change this
```

---

## Step 7 — Build and Start the Stack

```bash
docker compose up -d --build
```

Docker will:

1. Build the Next.js image from `./front`
2. Pull MySQL, Redis, WordPress, and Traefik images
3. Start all containers
4. Traefik will automatically request TLS certificates from Let's Encrypt

Check that all containers are running:

```bash
docker compose ps
```

Watch Traefik logs to confirm certificate issuance:

```bash
docker compose logs -f traefik
```

You should see lines like `"Obtained domains" domain="kadochi.com"` once the certificates are issued (usually within 30 seconds).

---

## Step 8 — Complete the WordPress Setup

1. Visit `https://api.kadochi.com` in your browser
2. Complete the WordPress installation wizard (language, site title, admin account)
3. After setup, go to **Settings → General** and set:
   - **WordPress Address (URL):** `https://api.kadochi.com`
   - **Site Address (URL):** `https://api.kadochi.com`
4. Save changes

---

## Step 9 — Verify Everything

| URL                       | Expected result                  |
| ------------------------- | -------------------------------- |
| `https://kadochi.com`     | Next.js frontend                 |
| `https://www.kadochi.com` | Redirects to `kadochi.com`       |
| `https://api.kadochi.com` | WordPress site                   |
| `http://kadochi.com`      | Redirects to HTTPS automatically |

---

## Updating the Application

To deploy new code changes:

```bash
git pull
docker compose up -d --build
```

Only containers whose images have changed are recreated; others keep running.

> **Always rebuild after frontend changes.** Next.js is compiled into a static production image — changes to `front/` only take effect after a new `docker compose up -d --build`. There is no hot reload in production.

To apply new environment variable changes only (no code change):

```bash
docker compose up -d --force-recreate nextjs
```

---

## Useful Commands

```bash
# View running containers
docker compose ps

# View logs for a specific service
docker compose logs -f nextjs
docker compose logs -f wordpress
docker compose logs -f traefik

# Restart a single service
docker compose restart nextjs

# Stop the entire stack
docker compose down

# Stop and remove all volumes (⚠️ deletes database data)
docker compose down -v
```

---

## Troubleshooting

**Certificate not issued / HTTPS not working**

- Confirm ports 80 and 443 are open: `curl -I http://kadochi.com`
- Check DNS has propagated: `dig kadochi.com +short`
- If DNS points through a proxy/CDN, disable proxying during certificate issuance so Let's Encrypt reaches Traefik directly.
- If Let's Encrypt reports `too many failed authorizations`, wait until the `retry after` time in Traefik logs before restarting Traefik or recreating routers.
- Check Traefik logs: `docker compose logs traefik`
- Make sure `letsencrypt/acme.json` has `chmod 600`

**WordPress shows wrong URL / redirect loop**

- Go to **Settings → General** and fix both URL fields to `https://api.kadochi.com`
- Or fix via WP-CLI: `docker exec kadochi-wordpress wp option update siteurl https://api.kadochi.com --allow-root`

**Next.js container fails to build**

- Check build logs: `docker compose logs nextjs`
- Test the build locally first: `docker compose -f docker-compose.local.yml up --build`

**Database connection errors**

- Ensure MySQL is healthy: `docker compose ps mysql`
- Check MySQL logs: `docker compose logs mysql`
- Verify credentials in `docker-compose.yml` match between the `mysql` and `wordpress` services
