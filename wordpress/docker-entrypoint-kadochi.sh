#!/bin/sh
set -eu

install_plugin() {
  plugin_name="$1"
  plugin_source="/opt/kadochi-plugins/${plugin_name}"
  plugin_target="/var/www/html/wp-content/plugins/${plugin_name}"

  if [ ! -f "${plugin_target}/index.php" ]; then
    mkdir -p "$(dirname "${plugin_target}")"
    cp -a "${plugin_source}" "${plugin_target}"
  fi
}

install_plugin "zarinpal-woocommerce-payment-gateway"
install_plugin "secure-custom-fields"

exec docker-entrypoint.sh "$@"
