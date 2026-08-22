#!/bin/sh
set -eu

install_plugin() {
  plugin_name="$1"
  plugin_entrypoint="${2:-index.php}"
  plugin_source="/opt/kadochi-plugins/${plugin_name}"
  plugin_target="/var/www/html/wp-content/plugins/${plugin_name}"

  if [ -f "${plugin_target}/${plugin_entrypoint}" ]; then
    return
  fi

  if [ -e "${plugin_target}" ]; then
    echo "Kadochi: refusing to overwrite incomplete plugin directory ${plugin_target}" >&2
    exit 1
  fi

  mkdir -p "$(dirname "${plugin_target}")"
  cp -a "${plugin_source}" "${plugin_target}"
}

wp_cli() {
  if [ "$(id -u)" -eq 0 ]; then
    wp --allow-root --path=/var/www/html "$@"
  else
    wp --path=/var/www/html "$@"
  fi
}

require_installed_wordpress() {
  if ! wp_cli core is-installed >/dev/null 2>&1; then
    echo "Kadochi: WordPress must be installed before managing Redis object cache." >&2
    exit 1
  fi
}

require_pinned_redis_plugin() {
  actual_version="$(wp_cli plugin get redis-cache --field=version 2>/dev/null || :)"
  expected_version="${KADOCHI_REDIS_CACHE_VERSION:-2.8.0}"

  if [ "${actual_version}" != "${expected_version}" ]; then
    echo "Kadochi: expected Redis Object Cache ${expected_version}, found ${actual_version:-none}; refusing to continue." >&2
    exit 1
  fi
}

require_safe_redis_dropin() {
  redis_dropin_source="/var/www/html/wp-content/plugins/redis-cache/includes/object-cache.php"
  redis_dropin_target="/var/www/html/wp-content/object-cache.php"

  if [ -e "${redis_dropin_target}" ] && ! cmp -s "${redis_dropin_source}" "${redis_dropin_target}"; then
    echo "Kadochi: a foreign or different object-cache.php exists; inspect it before enabling Redis." >&2
    exit 1
  fi
}

require_reachable_redis() {
  php -r '
    $host = getenv("WP_REDIS_HOST") ?: "redis";
    $port = (int) (getenv("WP_REDIS_PORT") ?: 6379);
    $socket = @fsockopen($host, $port, $errorNumber, $errorMessage, 2.0);
    if ($socket === false) {
        fwrite(STDERR, "Kadochi: Redis is unreachable.\n");
        exit(1);
    }
    stream_set_timeout($socket, 2);
    fwrite($socket, "*1\r\n\$4\r\nPING\r\n");
    $response = fgets($socket);
    fclose($socket);
    if (trim((string) $response) !== "+PONG") {
        fwrite(STDERR, "Kadochi: Redis did not return PONG.\n");
        exit(1);
    }
  '
}

enable_redis_object_cache() {
  require_installed_wordpress
  require_pinned_redis_plugin
  require_safe_redis_dropin
  require_reachable_redis

  if ! wp_cli plugin is-active redis-cache; then
    wp_cli plugin activate redis-cache
  fi

  wp_cli redis enable
  wp_cli redis status
}

disable_redis_object_cache() {
  redis_dropin_source="/var/www/html/wp-content/plugins/redis-cache/includes/object-cache.php"
  redis_dropin_target="/var/www/html/wp-content/object-cache.php"
  redis_dropin_backup="/var/www/html/wp-content/object-cache.php.kadochi-disabled"

  if [ -e "${redis_dropin_target}" ]; then
    if ! cmp -s "${redis_dropin_source}" "${redis_dropin_target}"; then
      echo "Kadochi: refusing to move a foreign or different object-cache.php." >&2
      exit 1
    fi

    mv -f "${redis_dropin_target}" "${redis_dropin_backup}"
  fi

  require_installed_wordpress
  if wp_cli plugin is-active redis-cache; then
    wp_cli plugin deactivate redis-cache
  fi

  echo "Kadochi: Redis object cache is disabled."
}

install_plugin "zarinpal-woocommerce-payment-gateway"
install_plugin "secure-custom-fields"
install_plugin "redis-cache" "redis-cache.php"

case "${1:-}" in
  kadochi-enable-redis-object-cache)
    enable_redis_object_cache
    exit 0
    ;;
  kadochi-disable-redis-object-cache)
    disable_redis_object_cache
    exit 0
    ;;
esac

exec docker-entrypoint.sh "$@"
