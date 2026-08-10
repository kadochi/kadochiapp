FROM wordpress:7-php8.2-apache

ARG ZARINPAL_GATEWAY_VERSION=5.1.1
ARG ZARINPAL_GATEWAY_SHA256=82eede70a9c3e1fd1f49c401560ee29b0fa3b20e39c8a4b5faf6b59ca27821ad
ARG SCF_VERSION=6.9.1
ARG SCF_SHA256=c8f81b625e7c9931feba1743d44fef3da9ad03a91bcfb3f364d8c17b17cde253
ARG REDIS_CACHE_VERSION=2.8.0
ARG REDIS_CACHE_SHA256=f077ac8b9c154cee936d3872b0734d42f7fd7f350e68fe8b2b20a69e854980cd
ARG WP_CLI_VERSION=2.12.0
ARG WP_CLI_SHA256=ce34ddd838f7351d6759068d09793f26755463b4a4610a5a5c0a97b68220d85c

ENV KADOCHI_REDIS_CACHE_VERSION=${REDIS_CACHE_VERSION}

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends unzip; \
    rm -rf /var/lib/apt/lists/*; \
    curl -fsSL "https://downloads.wordpress.org/plugin/zarinpal-woocommerce-payment-gateway.${ZARINPAL_GATEWAY_VERSION}.zip" -o /tmp/zarinpal.zip; \
    echo "${ZARINPAL_GATEWAY_SHA256}  /tmp/zarinpal.zip" | sha256sum -c -; \
    curl -fsSL "https://downloads.wordpress.org/plugin/secure-custom-fields.${SCF_VERSION}.zip" -o /tmp/scf.zip; \
    echo "${SCF_SHA256}  /tmp/scf.zip" | sha256sum -c -; \
    curl -fsSL "https://downloads.wordpress.org/plugin/redis-cache.${REDIS_CACHE_VERSION}.zip" -o /tmp/redis-cache.zip; \
    echo "${REDIS_CACHE_SHA256}  /tmp/redis-cache.zip" | sha256sum -c -; \
    curl -fsSL "https://github.com/wp-cli/wp-cli/releases/download/v${WP_CLI_VERSION}/wp-cli-${WP_CLI_VERSION}.phar" -o /tmp/wp-cli.phar; \
    echo "${WP_CLI_SHA256}  /tmp/wp-cli.phar" | sha256sum -c -; \
    mkdir -p /opt/kadochi-plugins; \
    unzip -q /tmp/zarinpal.zip -d /opt/kadochi-plugins; \
    unzip -q /tmp/scf.zip -d /opt/kadochi-plugins; \
    unzip -q /tmp/redis-cache.zip -d /opt/kadochi-plugins; \
    install -m 0755 /tmp/wp-cli.phar /usr/local/bin/wp; \
    rm /tmp/zarinpal.zip /tmp/scf.zip /tmp/redis-cache.zip /tmp/wp-cli.phar

COPY docker-entrypoint-kadochi.sh /usr/local/bin/docker-entrypoint-kadochi.sh
COPY kadochi-runtime-config.php /usr/local/lib/php/kadochi-runtime-config.php
COPY kadochi-runtime.ini /usr/local/etc/php/conf.d/zz-kadochi-runtime.ini
RUN chmod +x /usr/local/bin/docker-entrypoint-kadochi.sh

ENTRYPOINT ["docker-entrypoint-kadochi.sh"]
CMD ["apache2-foreground"]
