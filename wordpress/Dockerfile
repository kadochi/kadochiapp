FROM wordpress:7-php8.2-apache

ARG ZARINPAL_GATEWAY_VERSION=5.1.1
ARG ZARINPAL_GATEWAY_SHA256=82eede70a9c3e1fd1f49c401560ee29b0fa3b20e39c8a4b5faf6b59ca27821ad

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends unzip; \
    rm -rf /var/lib/apt/lists/*; \
    curl -fsSL "https://downloads.wordpress.org/plugin/zarinpal-woocommerce-payment-gateway.${ZARINPAL_GATEWAY_VERSION}.zip" -o /tmp/zarinpal.zip; \
    echo "${ZARINPAL_GATEWAY_SHA256}  /tmp/zarinpal.zip" | sha256sum -c -; \
    mkdir -p /opt/kadochi-plugins; \
    unzip -q /tmp/zarinpal.zip -d /opt/kadochi-plugins; \
    rm /tmp/zarinpal.zip

COPY docker-entrypoint-kadochi.sh /usr/local/bin/docker-entrypoint-kadochi.sh
RUN chmod +x /usr/local/bin/docker-entrypoint-kadochi.sh

ENTRYPOINT ["docker-entrypoint-kadochi.sh"]
CMD ["apache2-foreground"]
