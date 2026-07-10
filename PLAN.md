# Fresh headless WordPress + Next.js stack

## Summary

Replace the current codebase with a clean local-development Docker setup containing Next.js, WordPress, MySQL 8.0, and Redis. Keep application code in `front/` and the WordPress theme in `theme/`.

## Key changes

- Remove all existing tracked project files and replace them with:
  - `front/`: a TypeScript Next.js App Router starter configured for Docker hot reload.
  - `theme/`: a minimal valid WordPress theme (`style.css`, `functions.php`, `index.php`) mounted into WordPress.
  - Root `docker-compose.yml`, `.env.example`, `.gitignore`, and README with startup and restore instructions.
- Define Compose services:
  - `front`: Node 24 / Next.js development server on `http://localhost:3000`.
  - `wordpress`: official Apache-based WordPress image on `http://localhost:8080`, with `theme/` mounted under `wp-content/themes/`.
  - `mysql`: MySQL 8.0 with a persistent volume and health check.
  - `redis`: persistent, passwordless development Redis accessible only to other Compose services.
- Configure WordPress to wait for MySQL health; configure Next.js to receive internal and browser-visible WordPress API URLs through environment variables.
- Persist WordPress core/uploads/plugins and MySQL data in named Docker volumes. Mount source directories for live editing without storing dependencies or runtime data in Git.
- Make Next.js a headless consumer: include a small typed server-side WordPress REST API helper and a starter home page that verifies the connection without coupling public rendering to the PHP theme.
- Document restoring the production site with All-in-One WP Migration: install the plugin in local WordPress, import the backup archive through wp-admin, then update the WordPress/site URLs if prompted.

## Interfaces and configuration

- Environment template will define development-safe database credentials, WordPress admin/database values, and:
  - `WORDPRESS_URL=http://localhost:8080`
  - `WORDPRESS_INTERNAL_URL=http://wordpress`
  - `NEXT_PUBLIC_WORDPRESS_URL=http://localhost:8080`
- Next.js will use the internal URL for server-side requests and the public URL only where browser access is necessary.
- No Redis port will be exposed to the host; it is reserved for later application caching/session work.

## Test plan

- Start from an empty checkout with `docker compose up --build` and verify all four services become healthy/running.
- Confirm Next.js hot reload after changing a file in `front/`.
- Confirm WordPress loads, its REST API responds, and the custom theme appears in wp-admin.
- Confirm the Next.js starter can request the WordPress REST API.
- Restore a representative All-in-One WP Migration archive and verify posts, media, plugins, and theme persistence after container restarts.

## Assumptions

- The target is local development, not production deployment.
- MySQL 8.0 is selected to maximize compatibility with the production WordPress database.
- The custom theme remains available for WordPress/editor needs, while Next.js is the public-facing headless frontend.
