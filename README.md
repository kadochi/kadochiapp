# Kadochi local development

This repository runs a headless WordPress + Next.js development stack. Next.js is the public frontend; the PHP theme is retained for WordPress editing and administration.

## Requirements

- Docker Desktop with Docker Compose v2

## Start the stack

1. Create local environment values: `cp .env.example .env`
2. Start and build: `docker compose up --build`
3. Open the services:
   - Next.js: http://localhost:3000
   - WordPress admin: http://localhost:8080/wp-admin
   - WordPress REST API: http://localhost:8080/wp-json/wp/v2

On first launch, complete WordPress's installation wizard and activate **Kadochi Headless Admin Theme** in Appearance → Themes. Source edits in `front/` hot reload; edits in `theme/` are immediately mounted into WordPress.

## Services and storage

- `front`: Next.js development server (Node 24) on port 3000.
- `wordpress`: WordPress 7 Apache server on port 8080.
- `mysql`: MySQL 8.0, persisted in the `mysql_data` Docker volume.
- `redis`: internal-only, passwordless development Redis persisted in `redis_data`.

WordPress core, uploads, and plugins are persisted in `wordpress_data`. Docker volumes survive ordinary `docker compose down` and container rebuilds. To remove all local site data intentionally, run `docker compose down --volumes`.

## Restore an All-in-One WP Migration backup

1. Start the stack and finish the WordPress installation wizard.
2. In WordPress admin, install and activate **All-in-One WP Migration**.
3. Open All-in-One WP Migration → Import and select the `.wpress` archive.
4. Confirm the import, then sign in again if WordPress requests it.
5. If the restored site redirects to its production domain, update **Settings → General** so both URLs use `http://localhost:8080`. Use the plugin's database find/replace tooling if serialized content still contains the production URL.

The archive itself is ignored by Git. Imported posts, media, plugins, and the WordPress database persist through container restarts in Docker volumes. The local `theme/` bind mount remains the source of truth for the Kadochi theme.
