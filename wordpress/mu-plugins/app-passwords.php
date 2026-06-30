<?php
/**
 * WordPress gates Application Password auth on is_ssl(), but both local and
 * production stacks route Next.js → WordPress over an internal Docker HTTP
 * network (WP_BASE_URL=http://wordpress), so is_ssl() is always false for
 * server-side REST calls. HTTPS is enforced externally (Traefik in production,
 * browser-only in local), so it is safe to enable Application Passwords
 * unconditionally here.
 */
add_filter( 'wp_is_application_passwords_available', '__return_true' );
