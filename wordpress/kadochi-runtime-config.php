<?php

/**
 * Container-owned WordPress runtime configuration.
 *
 * The official image writes WORDPRESS_CONFIG_EXTRA only while creating a new
 * wp-config.php. This bootstrap runs before WordPress for both new and existing
 * volumes, while leaving constants already defined by an earlier prepend file
 * untouched.
 */

$kadochiDefineString = static function (string $name): void {
    if (defined($name)) {
        return;
    }

    $value = getenv($name);
    if ($value !== false && $value !== '') {
        define($name, $value);
    }
};

$kadochiDefineInteger = static function (string $name, int $minimum, int $maximum): void {
    if (defined($name)) {
        return;
    }

    $value = getenv($name);
    if ($value === false || $value === '') {
        return;
    }

    $validated = filter_var(
        $value,
        FILTER_VALIDATE_INT,
        array('options' => array('min_range' => $minimum, 'max_range' => $maximum))
    );

    if ($validated !== false) {
        define($name, $validated);
    }
};

$kadochiDefineBoolean = static function (string $name): void {
    if (defined($name)) {
        return;
    }

    $value = getenv($name);
    if ($value === false || $value === '') {
        return;
    }

    $validated = filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($validated !== null) {
        define($name, $validated);
    }
};

$kadochiDefineString('WP_REDIS_HOST');
$kadochiDefineInteger('WP_REDIS_PORT', 1, 65535);
$kadochiDefineInteger('WP_REDIS_DATABASE', 0, 15);
$kadochiDefineString('WP_REDIS_PREFIX');
$kadochiDefineString('WP_REDIS_CLIENT');
$kadochiDefineInteger('WP_REDIS_TIMEOUT', 1, 60);
$kadochiDefineInteger('WP_REDIS_READ_TIMEOUT', 1, 60);
$kadochiDefineBoolean('WP_REDIS_DISABLED');
$kadochiDefineBoolean('WP_REDIS_DISABLE_DROPIN_AUTOUPDATE');
$kadochiDefineBoolean('WP_CACHE');
$kadochiDefineBoolean('DISABLE_WP_CRON');
$kadochiDefineString('WP_HOME');
$kadochiDefineString('WP_SITEURL');

// Internal Docker HTTP requests carrying Woo query-key credentials originate
// from a trusted container network and must be evaluated as HTTPS by WooCommerce.
if (!empty($_GET['consumer_key']) && !empty($_GET['consumer_secret'])) {
    $_SERVER['HTTPS'] = 'on';
}

unset($kadochiDefineString, $kadochiDefineInteger, $kadochiDefineBoolean);
