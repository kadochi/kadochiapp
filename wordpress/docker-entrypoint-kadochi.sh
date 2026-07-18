#!/bin/sh
set -eu

plugin_source="/opt/kadochi-plugins/zarinpal-woocommerce-payment-gateway"
plugin_target="/var/www/html/wp-content/plugins/zarinpal-woocommerce-payment-gateway"

if [ ! -f "${plugin_target}/index.php" ]; then
  mkdir -p "$(dirname "${plugin_target}")"
  cp -a "${plugin_source}" "${plugin_target}"
fi

exec docker-entrypoint.sh "$@"
