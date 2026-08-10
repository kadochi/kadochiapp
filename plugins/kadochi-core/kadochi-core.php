<?php
/**
 * Plugin Name: Kadochi Core
 * Description: Durable headless content contracts and protected occasion records for Kadochi.
 * Version: 0.2.1
 * Requires at least: 6.6
 * Requires PHP: 7.4
 * Text Domain: kadochi-core
 */

defined( 'ABSPATH' ) || exit;

final class Kadochi_Core {
	const REST_NAMESPACE = 'kadochi/v1';
	const SCF_MIN_VERSION = '6.0.0';
	const OTP_TTL_SECONDS = 180;
	const OTP_RESEND_SECONDS = 60;
	const OTP_MAX_ATTEMPTS = 5;
	const OTP_RESEND_LIMIT_PER_HOUR = 3;
	const OTP_SEND_LIMIT_PER_HOUR = self::OTP_RESEND_LIMIT_PER_HOUR + 1;
	const OTP_GLOBAL_ATTEMPT_LIMIT_PER_HOUR = 120;
	const OTP_INTERNAL_AUTH_SKEW_SECONDS = 120;
	const JWT_TTL_SECONDS = 604800;
	const CHECKOUT_FIELD_DELIVERY_SLOT = 'kadochi/delivery-slot';
	const CHECKOUT_FIELD_PACKAGING = 'kadochi/packaging';
	const CHECKOUT_FIELD_POSTCARD = 'kadochi/postcard';
	const CHECKOUT_FIELD_POSTCARD_DESIGN = 'kadochi/postcard-design';
	const CHECKOUT_FIELD_LOCATION = 'kadochi/location';
	const CHECKOUT_FIELD_OPERATION = 'kadochi/operation-id';
	const PRODUCT_ACTIONS_DB_VERSION = '1';
	const NOTIFICATIONS_DB_VERSION = '1';
	const NOTIFICATION_REMINDER_HOOK = 'kadochi_send_occasion_notifications';
	const EDITORIAL_CAPABILITIES_VERSION = '4';
	const MAGAZINE_TO_POSTS_MIGRATION_VERSION = '1';
	const STORY_VISIBILITY_SECONDS = 172800;
	const PRODUCT_VIEW_COUNT_META_KEY = '_kadochi_product_view_count';
	const ARTICLE_VIEW_COUNT_META_KEY = '_kadochi_article_view_count';
	const PRODUCT_PREPARATION_HOURS_META_KEY = '_kadochi_preparation_hours';
	const DEFAULT_PRODUCT_PREPARATION_HOURS = 24;
	const MAX_PRODUCT_PREPARATION_HOURS = 720;
	const DRAFT_ORDER_EXPIRATION_SECONDS = 3600;
	const DRAFT_ORDER_EXPIRY_HOOK = 'kadochi_expire_draft_orders';
	const PAYMENT_ATTEMPT_LOCK_SECONDS = 60;
	const EDITORIAL_REQUESTS_PER_HOUR = 30;
	const EDITORIAL_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

	/** @var array<string, string> */
	private $health = array();
	/** @var WP_Error|null */
	private $bearer_error = null;
	/** @var array<string, mixed>|null Context used only while the gateway emits its redirect. */
	private $active_payment_attempt = null;

	public function boot() {
		self::maybe_install_product_actions_table();
		self::maybe_install_notifications_table();
		self::maybe_grant_editorial_capabilities();
		add_action( 'init', array( $this, 'register_post_types' ), 5 );
		add_action( 'init', array( $this, 'maybe_migrate_magazine_articles_to_posts' ), 6 );
		add_action( 'init', array( $this, 'schedule_draft_order_expiry' ) );
		add_action( 'init', array( $this, 'schedule_notification_reminders' ) );
		add_action( self::DRAFT_ORDER_EXPIRY_HOOK, array( $this, 'expire_stale_draft_orders' ) );
		add_action( self::NOTIFICATION_REMINDER_HOOK, array( $this, 'send_occasion_notifications' ) );
		add_filter( 'cron_schedules', array( $this, 'draft_order_expiry_schedule' ) );
		add_action( 'init', array( $this, 'harden_existing_occasion_type' ), 99 );
		add_action( 'acf/init', array( $this, 'register_scf_fields' ) );
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'rest_endpoints', array( $this, 'remove_default_occasion_routes' ) );
		add_filter( 'robots_txt', array( $this, 'robots_txt' ), 10, 2 );
		add_action( 'rest_pre_serve_request', array( $this, 'send_rest_noindex_header' ), 10, 4 );
		add_action( 'admin_init', array( $this, 'send_noindex_header' ) );
		add_action( 'login_init', array( $this, 'send_noindex_header' ) );
		add_filter( 'determine_current_user', array( $this, 'determine_current_user' ), 30 );
		add_filter( 'rest_authentication_errors', array( $this, 'rest_authentication_errors' ), 30 );
		add_action( 'woocommerce_init', array( $this, 'register_checkout_fields' ) );
		add_action( 'woocommerce_blocks_loaded', array( $this, 'register_store_api_data' ) );
		add_filter( 'woocommerce_store_api_add_to_cart_data', array( $this, 'mark_cross_sell_cart_item' ), 10, 2 );
		add_action( 'woocommerce_product_options_general_product_data', array( $this, 'render_product_preparation_hours_field' ) );
		add_action( 'woocommerce_process_product_meta', array( $this, 'save_product_preparation_hours_field' ) );
		add_action( 'woocommerce_validate_additional_field', array( $this, 'validate_checkout_field' ), 10, 3 );
		add_action( 'woocommerce_check_cart_items', array( $this, 'clear_stale_store_api_cart_notices' ), 0 );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( $this, 'validate_store_checkout_order' ), 10, 2 );
		add_action( 'woocommerce_admin_order_data_after_order_details', array( $this, 'render_postcard_order_details' ) );
		add_action( 'woocommerce_store_api_checkout_order_processed', array( $this, 'lock_store_checkout_order' ), 1 );
		add_action( 'woocommerce_payment_complete', array( $this, 'notify_paid_order' ) );
		add_action( 'woocommerce_order_status_changed', array( $this, 'notify_order_status_change' ), 10, 4 );
		add_filter( 'woocommerce_package_rates', array( $this, 'limit_shipping_to_tehran' ), 10, 2 );
		add_filter( 'woocommerce_customer_taxable_address', array( $this, 'limit_tax_to_tehran' ), 10, 2 );
		add_filter( 'woocommerce_get_return_url', array( $this, 'checkout_return_url' ), 20, 2 );
		// The gateway verifies its callback on the WordPress origin, then uses
		// wp_safe_redirect() to return the customer to the headless frontend.
		add_filter( 'allowed_redirect_hosts', array( $this, 'allow_frontend_checkout_redirect_host' ), 20, 2 );
		// The official ZarinPal gateway sends a cancelled payment to Woo's checkout
		// URL directly, so handle its API callback before the gateway's own handler.
		add_action( 'woocommerce_api_wc_zpal', array( $this, 'redirect_cancelled_gateway_payment' ), 1 );
		add_filter( 'get_avatar_url', array( $this, 'customer_avatar_url_filter' ), 10, 3 );
		add_action( 'show_user_profile', array( $this, 'render_customer_profile_fields' ) );
		add_action( 'edit_user_profile', array( $this, 'render_customer_profile_fields' ) );
		add_action( 'personal_options_update', array( $this, 'save_customer_profile_fields' ) );
		add_action( 'edit_user_profile_update', array( $this, 'save_customer_profile_fields' ) );
		add_filter( 'manage_users_columns', array( $this, 'add_customer_user_columns' ) );
		add_filter( 'manage_users_custom_column', array( $this, 'render_customer_user_column' ), 10, 3 );
		add_filter( 'manage_edit-product_columns', array( $this, 'add_product_engagement_columns' ), 20 );
		add_filter( 'hidden_columns', array( $this, 'keep_product_views_column_visible' ), 10, 2 );
		add_action( 'manage_product_posts_custom_column', array( $this, 'render_product_engagement_column' ), 10, 2 );
		add_action( 'admin_head-edit.php', array( $this, 'style_product_engagement_columns' ) );
		add_filter( 'manage_post_posts_columns', array( $this, 'add_article_view_column' ), 20 );
		add_filter( 'manage_edit-post_sortable_columns', array( $this, 'make_article_views_sortable' ) );
		add_filter( 'hidden_columns', array( $this, 'keep_article_views_column_visible' ), 10, 2 );
		add_action( 'manage_post_posts_custom_column', array( $this, 'render_article_view_column' ), 10, 2 );
		add_filter( 'posts_clauses', array( $this, 'sort_articles_by_views' ), 10, 2 );
		add_action( 'admin_head-edit.php', array( $this, 'style_article_view_column' ) );
		add_action( 'admin_notices', array( $this, 'render_admin_notices' ) );
	}

	/** Keeps the headless CMS surface out of search results when its origin is public. */
	public function robots_txt( $output, $is_public ) {
		if ( ! $is_public ) {
			return $output;
		}

		$directives = array(
			'User-agent: *',
			'Disallow: /wp-admin/',
			'Allow: /wp-admin/admin-ajax.php',
			'Disallow: /wp-json/',
			'Disallow: /wp-login.php',
			'Disallow: /xmlrpc.php',
		);

		return trim( $output ) . "\n" . implode( "\n", $directives ) . "\n";
	}

	/** Sends an HTTP robots directive for REST responses, including custom namespaces. */
	public function send_rest_noindex_header( $served, $result, $request, $server ) {
		$server->send_header( 'X-Robots-Tag', 'noindex, nofollow' );
		return $served;
	}

	/** WordPress admin and login screens should remain unavailable to search engines. */
	public function send_noindex_header() {
		if ( ! headers_sent() ) {
			header( 'X-Robots-Tag: noindex, nofollow', true );
		}
	}

	public static function activate() {
		self::grant_editorial_capabilities();
		self::revoke_magazine_capabilities();
		update_option( 'kadochi_editorial_capabilities_version', self::EDITORIAL_CAPABILITIES_VERSION, false );
		self::install_product_actions_table();
		self::install_notifications_table();
		flush_rewrite_rules();
	}

	/** Stores one durable like/save row per authenticated customer and product. */
	private static function install_product_actions_table() {
		global $wpdb;
		$table = $wpdb->prefix . 'kadochi_product_actions';
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			product_id bigint(20) unsigned NOT NULL,
			action_type varchar(10) NOT NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY user_product_action (user_id,product_id,action_type),
			KEY product_action (product_id,action_type)
		) {$wpdb->get_charset_collate()};" );
		update_option( 'kadochi_product_actions_db_version', self::PRODUCT_ACTIONS_DB_VERSION, false );
	}

	private static function maybe_install_product_actions_table() {
		if ( self::PRODUCT_ACTIONS_DB_VERSION !== get_option( 'kadochi_product_actions_db_version' ) ) {
			self::install_product_actions_table();
		}
	}

	/** Stores app notifications independently from ephemeral WordPress notices. */
	private static function install_notifications_table() {
		global $wpdb;
		$table = $wpdb->prefix . 'kadochi_notifications';
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( "CREATE TABLE {$table} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			user_id bigint(20) unsigned NOT NULL,
			event_key varchar(191) NOT NULL,
			type varchar(50) NOT NULL,
			message text NOT NULL,
			is_read tinyint(1) NOT NULL DEFAULT 0,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY user_event (user_id,event_key),
			KEY user_unread (user_id,is_read,id)
		) {$wpdb->get_charset_collate()};" );
		update_option( 'kadochi_notifications_db_version', self::NOTIFICATIONS_DB_VERSION, false );
	}

	private static function maybe_install_notifications_table() {
		if ( self::NOTIFICATIONS_DB_VERSION !== get_option( 'kadochi_notifications_db_version' ) ) {
			self::install_notifications_table();
		}
	}

	private static function post_type_capabilities( $singular, $plural ) {
		return array(
			'edit_post' => 'edit_' . $singular,
			'read_post' => 'read_' . $singular,
			'delete_post' => 'delete_' . $singular,
			'edit_posts' => 'edit_' . $plural,
			'edit_others_posts' => 'edit_others_' . $plural,
			'publish_posts' => 'publish_' . $plural,
			'read_private_posts' => 'read_private_' . $plural,
			'delete_posts' => 'delete_' . $plural,
			'delete_private_posts' => 'delete_private_' . $plural,
			'delete_published_posts' => 'delete_published_' . $plural,
			'delete_others_posts' => 'delete_others_' . $plural,
			'edit_private_posts' => 'edit_private_' . $plural,
			'edit_published_posts' => 'edit_published_' . $plural,
			'create_posts' => 'edit_' . $plural,
		);
	}

	private static function grant_editorial_capabilities() {
		$types = array( 'slider' => array( 'slider', 'sliders' ), 'banner' => array( 'banner', 'banners' ), 'hero' => array( 'hero', 'heroes' ), 'story' => array( 'story', 'stories' ), 'occasion' => array( 'occasion', 'occasions' ) );
		foreach ( array( 'administrator', 'editor', 'shop_manager' ) as $role_name ) {
			$role = get_role( $role_name );
			if ( ! $role ) {
				continue;
			}
			foreach ( $types as $pair ) {
				foreach ( self::post_type_capabilities( $pair[0], $pair[1] ) as $capability ) {
					$role->add_cap( $capability );
				}
			}
		}
	}

	/** Removes capabilities that only belonged to the retired Magazine post type. */
	private static function revoke_magazine_capabilities() {
		foreach ( array( 'administrator', 'editor', 'shop_manager' ) as $role_name ) {
			$role = get_role( $role_name );
			if ( ! $role ) {
				continue;
			}
			foreach ( self::post_type_capabilities( 'magazine', 'magazines' ) as $capability ) {
				$role->remove_cap( $capability );
			}
		}
	}

	/** Applies capabilities on plugin upgrades as well as first activation. */
	private static function maybe_grant_editorial_capabilities() {
		if ( self::EDITORIAL_CAPABILITIES_VERSION === get_option( 'kadochi_editorial_capabilities_version' ) ) {
			return;
		}
		self::grant_editorial_capabilities();
		self::revoke_magazine_capabilities();
		update_option( 'kadochi_editorial_capabilities_version', self::EDITORIAL_CAPABILITIES_VERSION, false );
	}

	public function register_post_types() {
		$this->register_post_type( 'slider', 'Sliders', 'Slider', array( 'title', 'editor', 'thumbnail' ), true, 'dashicons-images-alt2' );
		$this->register_post_type( 'banner', 'Banners', 'Banner', array( 'title', 'editor', 'thumbnail' ), true, 'dashicons-megaphone' );
		$this->register_post_type( 'hero', 'Heroes', 'Hero', array( 'title', 'editor', 'thumbnail' ), true, 'dashicons-superhero' );
		// Stories use the native Featured Image uploader. Their public lifetime is
		// enforced by the homepage response, rather than by deleting content.
		$this->register_post_type( 'story', 'Stories', 'Story', array( 'title', 'thumbnail' ), false, 'dashicons-format-image' );
		$this->register_post_type( 'occasion', 'Occasions', 'Occasion', array( 'title', 'editor', 'thumbnail', 'author' ), false, 'dashicons-calendar-alt' );
		// Postcards are editorial assets. Their native title and Featured Image
		// controls give staff a simple place to add, publish, reorder, and retire
		// designs without making the assets public WordPress pages.
		register_post_type( 'postcard', array(
			'labels' => array( 'name' => __( 'Postcard designs', 'kadochi-core' ), 'singular_name' => __( 'Postcard design', 'kadochi-core' ), 'menu_name' => __( 'Postcards', 'kadochi-core' ), 'add_new_item' => __( 'Add new postcard design', 'kadochi-core' ) ),
			'public' => false,
			'publicly_queryable' => false,
			'show_ui' => true,
			'show_in_menu' => true,
			'exclude_from_search' => true,
			'show_in_rest' => false,
			'has_archive' => false,
			'rewrite' => false,
			'query_var' => false,
			'menu_icon' => 'dashicons-format-image',
			'supports' => array( 'title', 'thumbnail', 'page-attributes' ),
			'capability_type' => 'post',
			'map_meta_cap' => true,
		) );
	}

	/**
	 * Consolidates legacy Magazine articles into WordPress Posts without
	 * recreating records, so IDs, featured images, taxonomy terms, post meta,
	 * authors, and publication dates are retained.
	 */
	public function maybe_migrate_magazine_articles_to_posts() {
		if ( self::MAGAZINE_TO_POSTS_MIGRATION_VERSION === get_option( 'kadochi_magazine_to_posts_migration_version' ) ) {
			return;
		}

		global $wpdb;
		$post_ids = $wpdb->get_col( $wpdb->prepare( "SELECT ID FROM {$wpdb->posts} WHERE post_type = %s", 'magazine' ) );
		foreach ( $post_ids as $post_id ) {
			$updated = $wpdb->update(
				$wpdb->posts,
				array( 'post_type' => 'post' ),
				array( 'ID' => (int) $post_id ),
				array( '%s' ),
				array( '%d' )
			);
			if ( false === $updated ) {
				return;
			}
			clean_post_cache( (int) $post_id );
		}

		update_option( 'kadochi_magazine_to_posts_migration_version', self::MAGAZINE_TO_POSTS_MIGRATION_VERSION, false );
	}

	private function register_post_type( $slug, $plural_label, $singular_label, $supports, $legacy_public, $menu_icon ) {
		if ( post_type_exists( $slug ) ) {
			return;
		}
		$capability_bases = array(
			'slider'   => array( 'slider', 'sliders' ),
			'banner'   => array( 'banner', 'banners' ),
			'hero'     => array( 'hero', 'heroes' ),
			'story'    => array( 'story', 'stories' ),
			'occasion' => array( 'occasion', 'occasions' ),
		);
		$singular = $capability_bases[ $slug ][0];
		$plural   = $capability_bases[ $slug ][1];
		register_post_type(
			$slug,
			array(
				'labels' => array( 'name' => $plural_label, 'singular_name' => $singular_label, 'menu_name' => $plural_label, 'add_new_item' => sprintf( __( 'Add New %s', 'kadochi-core' ), $singular_label ) ),
				'public' => $legacy_public,
				'publicly_queryable' => $legacy_public,
				'show_ui' => true,
				'show_in_menu' => true,
				'show_in_nav_menus' => $legacy_public,
				'exclude_from_search' => ! $legacy_public,
				'show_in_rest' => $legacy_public,
				'has_archive' => false,
				'rewrite' => $legacy_public,
				'query_var' => $legacy_public,
				'taxonomies' => array(),
				'menu_icon' => $menu_icon,
				'supports' => $supports,
				'capability_type' => array( $singular, $plural ),
				'capabilities' => self::post_type_capabilities( $singular, $plural ),
				'map_meta_cap' => true,
				'delete_with_user' => false,
			)
		);
	}

	/** Security override for legacy/imported registrations; content is still manageable in wp-admin. */
	public function harden_existing_occasion_type() {
		global $wp_post_types;
		if ( empty( $wp_post_types['occasion'] ) ) {
			$this->health['occasion'] = __( 'The occasion post type was not registered.', 'kadochi-core' );
			return;
		}
		$type = $wp_post_types['occasion'];
		$type->public = false;
		$type->publicly_queryable = false;
		$type->show_in_nav_menus = false;
		$type->exclude_from_search = true;
		$type->show_in_rest = false;
		$type->has_archive = false;
		$type->rewrite = false;
		$type->query_var = false;
		$type->show_ui = true;
	}

	public function remove_default_occasion_routes( $endpoints ) {
		foreach ( array_keys( $endpoints ) as $route ) {
			if ( 0 === strpos( $route, '/wp/v2/occasion' ) ) {
				unset( $endpoints[ $route ] );
			}
		}
		return $endpoints;
	}

	public function register_scf_fields() {
		if ( ! function_exists( 'acf_add_local_field_group' ) ) {
			$this->health['scf'] = __( 'Secure Custom Fields is required. Install and activate a SCF release compatible with the ACF local-field API.', 'kadochi-core' );
			return;
		}
		$version = defined( 'SCF_VERSION' ) ? SCF_VERSION : ( defined( 'ACF_VERSION' ) ? ACF_VERSION : null );
		if ( $version && version_compare( $version, self::SCF_MIN_VERSION, '<' ) ) {
			$this->health['scf'] = sprintf( __( 'Secure Custom Fields %s or newer is required; found %s.', 'kadochi-core' ), self::SCF_MIN_VERSION, $version );
			return;
		}
		foreach ( $this->field_groups() as $group ) {
			acf_add_local_field_group( $group );
		}
	}

	private function field( $key, $label, $name, $type, $extra = array() ) {
		return array_merge( array( 'key' => $key, 'label' => $label, 'name' => $name, 'type' => $type, 'required' => 0, 'conditional_logic' => 0, 'wrapper' => array( 'width' => '', 'class' => '', 'id' => '' ) ), $extra );
	}

	private function field_groups() {
		$image_url = array( 'return_format' => 'url', 'library' => 'all', 'preview_size' => 'medium' );
		return array(
			array( 'key' => 'group_684b373196d67', 'title' => 'Banner', 'fields' => array( $this->field( 'field_684b3731a9469', 'Title', 'title', 'text' ), $this->field( 'field_684b3761a946a', 'Subtitle', 'subtitle', 'text' ), $this->field( 'field_684b376ca946b', 'CTA Text', 'cta_text', 'text' ), $this->field( 'field_684b377ba946c', 'CTA Link', 'cta_link', 'url' ), $this->field( 'field_684b3788a946d', 'Background Gradient', 'background_gradient', 'text' ), $this->field( 'field_684b37cea946e', 'Background Image', 'background_image', 'image', $image_url ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'banner' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
			array( 'key' => 'group_68ff3b5e2403e', 'title' => 'Hero', 'fields' => array( $this->field( 'field_68ff3b5e2bc20', 'Title', 'title', 'text' ), $this->field( 'field_68ff3b5e2bc21', 'Subtitle', 'subtitle', 'text' ), $this->field( 'field_68ff3b5e2bccb', 'CTA Text', 'cta_text', 'text' ), $this->field( 'field_68ff3b5e2bd1c', 'CTA Link', 'cta_link', 'url' ), $this->field( 'field_68ff3b5e2bdb4', 'Background Image', 'background_image', 'image', $image_url ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'hero' ) ) ), 'active' => true, 'show_in_rest' => 1 ),
			array( 'key' => 'group_684ada15be887', 'title' => 'Image Slider', 'fields' => array( $this->field( 'field_684ada1598922', 'Background Image', 'background_image', 'image', array( 'return_format' => 'array', 'library' => 'all', 'preview_size' => 'medium' ) ), $this->field( 'field_684ada7298923', 'Slider Title', 'slider_title', 'text' ), $this->field( 'field_684adaa998924', 'Slider Button Text', 'slider_button_text', 'text' ), $this->field( 'field_684adabd98925', 'Slider Link', 'slider_link', 'link', array( 'return_format' => 'url' ) ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'slider' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
			array( 'key' => 'group_68690d0e375df', 'title' => 'Occasion', 'fields' => array( $this->field( 'field_68690d0e8d04d', 'title', 'title', 'text' ), $this->field( 'field_68690d148d04e', 'occasion date', 'occasion_date', 'date_picker', array( 'display_format' => 'Y-m-d', 'return_format' => 'Y-m-d', 'first_day' => 6, 'default_to_current_date' => 0 ) ), $this->field( 'field_6a0c001e8d04f', 'Repeat annually', 'repeat_annually', 'true_false', array( 'default_value' => 1, 'ui' => 1 ) ), $this->field( 'field_699c24f932f43', 'user', 'user', 'user', array( 'return_format' => 'id', 'multiple' => 0, 'allow_null' => 0 ) ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'occasion' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
		);
	}

	public function register_routes() {
		register_rest_route( self::REST_NAMESPACE, '/health', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'health_response' ), 'permission_callback' => function () { return current_user_can( 'manage_options' ); } ) );
		register_rest_route( self::REST_NAMESPACE, '/content/home', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'homepage_content' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( self::REST_NAMESPACE, '/cart/cross-sells', array(
			'methods' => WP_REST_Server::READABLE,
			'callback' => array( $this, 'cart_cross_sells' ),
			'permission_callback' => '__return_true',
			'args' => array(
				'productIds' => array(
					'required' => true,
					'type' => 'string',
					'sanitize_callback' => 'sanitize_text_field',
				),
			),
		) );
		register_rest_route( self::REST_NAMESPACE, '/checkout/postcard-designs', array(
			'methods' => WP_REST_Server::READABLE,
			'callback' => array( $this, 'postcard_designs' ),
			'permission_callback' => '__return_true',
		) );
		register_rest_route( self::REST_NAMESPACE, '/auth/otp/start', array(
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => array( $this, 'start_otp' ),
			'permission_callback' => array( $this, 'public_auth_request' ),
			'args' => array( 'phone' => $this->phone_route_arg() ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/auth/otp/verify', array(
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => array( $this, 'verify_otp' ),
			'permission_callback' => array( $this, 'public_auth_request' ),
			'args' => array( 'phone' => $this->phone_route_arg(), 'code' => $this->code_route_arg() ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/customer', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'customer' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => 'PATCH', 'callback' => array( $this, 'update_customer_profile' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/customer/addresses', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_customer_addresses' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'create_customer_address' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/customer/addresses/(?P<id>[a-f0-9-]{36})', array(
			array( 'methods' => 'PUT', 'callback' => array( $this, 'update_customer_address' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => WP_REST_Server::DELETABLE, 'callback' => array( $this, 'delete_customer_address' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/profile/orders', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_profile_orders' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/profile/orders/(?P<id>\\d+)', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'profile_order_detail' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/profile/orders/(?P<id>\\d+)/retry-payment', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'retry_profile_order_payment' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/profile/product-actions', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_profile_product_actions' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/profile/notifications', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_notifications' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => 'PATCH', 'callback' => array( $this, 'mark_notifications_read' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/personal-profile', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'personal_profile' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => 'PUT', 'callback' => array( $this, 'update_personal_profile' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/public-profiles/(?P<username>[a-z0-9-]+)', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'public_personal_profile' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( self::REST_NAMESPACE, '/orders/(?P<id>\\d+)', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'order_summary' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/checkout/operations/(?P<operation>[a-f0-9-]{36})', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'operation_summary' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/reviews', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_reviews' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'create_review' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/comments', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_post_comments' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'create_post_comment' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/product-actions', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'product_actions' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => 'PUT', 'callback' => array( $this, 'update_product_action' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/product-views', array(
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'record_product_view' ), 'permission_callback' => '__return_true' ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/magazine-views', array(
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'record_article_view' ), 'permission_callback' => '__return_true' ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/occasions', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_occasions' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'create_occasion' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/occasions/(?P<id>\\d+)', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'get_occasion' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => 'PATCH', 'callback' => array( $this, 'update_occasion' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => WP_REST_Server::DELETABLE, 'callback' => array( $this, 'delete_occasion' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		// This private route is the server-side bridge used by the editorial
		// automation. It deliberately does not use a WordPress user password.
		register_rest_route( self::REST_NAMESPACE, '/editorial/articles', array(
			'methods' => WP_REST_Server::CREATABLE,
			'callback' => array( $this, 'create_editorial_article' ),
			'permission_callback' => array( $this, 'authorize_editorial_request' ),
		) );
	}

	/**
	 * Returns up to five merchant-configured WooCommerce cross-sells for the
	 * supplied cart products. Repeated recommendations rank first, then retain
	 * the order configured on each product.
	 */
	public function cart_cross_sells( WP_REST_Request $request ) {
		$raw_ids = explode( ',', (string) $request->get_param( 'productIds' ) );
		$product_ids = array_values( array_unique( array_filter( array_map( 'absint', $raw_ids ) ) ) );
		$product_ids = array_slice( $product_ids, 0, 50 );
		if ( empty( $product_ids ) || ! function_exists( 'wc_get_product' ) ) {
			return rest_ensure_response( array( 'ids' => array() ) );
		}

		$scores = array();
		$positions = array();
		$position = 0;
		foreach ( $product_ids as $product_id ) {
			$product = wc_get_product( $product_id );
			if ( ! $product ) {
				continue;
			}
			foreach ( $product->get_cross_sell_ids() as $cross_sell_id ) {
				$cross_sell_id = absint( $cross_sell_id );
				if ( ! $cross_sell_id || in_array( $cross_sell_id, $product_ids, true ) ) {
					continue;
				}
				$candidate = wc_get_product( $cross_sell_id );
				if ( ! $candidate || 'publish' !== $candidate->get_status() || ! $candidate->is_purchasable() || ! $candidate->is_in_stock() ) {
					continue;
				}
				if ( ! isset( $scores[ $cross_sell_id ] ) ) {
					$scores[ $cross_sell_id ] = 0;
					$positions[ $cross_sell_id ] = $position++;
				}
				$scores[ $cross_sell_id ]++;
			}
		}

		uksort( $scores, function( $left, $right ) use ( $scores, $positions ) {
			if ( $scores[ $left ] === $scores[ $right ] ) {
				return $positions[ $left ] <=> $positions[ $right ];
			}
			return $scores[ $right ] <=> $scores[ $left ];
		} );

		return rest_ensure_response( array( 'ids' => array_slice( array_map( 'absint', array_keys( $scores ) ), 0, 5 ) ) );
	}

	/**
	 * Authenticates the automation with a deployment secret. The secret belongs
	 * in the server environment, never in WordPress options or a client bundle.
	 */
	public function authorize_editorial_request( WP_REST_Request $request ) {
		$secret = getenv( 'KADOCHI_EDITORIAL_API_SECRET' );
		$provided = $request->get_header( 'x-kadochi-editorial-key' );
		if ( ! is_string( $secret ) || '' === trim( $secret ) || ! is_string( $provided ) || ! hash_equals( trim( $secret ), trim( $provided ) ) ) {
			return new WP_Error( 'kadochi_editorial_unauthorized', __( 'Editorial authorization failed.', 'kadochi-core' ), array( 'status' => 401 ) );
		}

		$rate_key = $this->transient_key( 'editorial_rate', $this->request_ip() );
		if ( $this->counter_value( $rate_key ) >= self::EDITORIAL_REQUESTS_PER_HOUR ) {
			return new WP_Error( 'kadochi_editorial_rate_limited', __( 'Too many editorial requests. Please try again later.', 'kadochi-core' ), array( 'status' => 429 ) );
		}
		$this->increment_counter( $rate_key, HOUR_IN_SECONDS );
		return true;
	}

	private function editorial_error( $code, $message, $status = 400 ) {
		return new WP_Error( $code, __( $message, 'kadochi-core' ), array( 'status' => $status ) );
	}

	private function editorial_string( $value, $field, $minimum, $maximum, $required = true ) {
		if ( ! is_string( $value ) ) {
			return $required ? $this->editorial_error( 'kadochi_editorial_invalid_' . $field, sprintf( __( '%s is required.', 'kadochi-core' ), $field ) ) : '';
		}
		$value = trim( wp_unslash( $value ) );
		$length = $this->string_length( $value );
		if ( $length < $minimum || $length > $maximum ) {
			return $this->editorial_error( 'kadochi_editorial_invalid_' . $field, sprintf( __( '%s has an invalid length.', 'kadochi-core' ), $field ) );
		}
		return $value;
	}

	private function editorial_terms( $terms, $taxonomy, $maximum ) {
		if ( ! is_array( $terms ) || count( $terms ) > $maximum ) {
			return $this->editorial_error( 'kadochi_editorial_invalid_' . $taxonomy, sprintf( __( '%s must be a short list.', 'kadochi-core' ), $taxonomy ) );
		}
		$ids = array();
		foreach ( $terms as $term ) {
			$name = $this->editorial_string( $term, $taxonomy, 1, 80 );
			if ( is_wp_error( $name ) ) {
				return $name;
			}
			$existing = term_exists( sanitize_title( $name ), $taxonomy );
			if ( ! $existing ) {
				$existing = wp_insert_term( $name, $taxonomy );
			}
			if ( is_wp_error( $existing ) ) {
				return $this->editorial_error( 'kadochi_editorial_term_failed', __( 'A category or tag could not be created.', 'kadochi-core' ), 500 );
			}
			$ids[] = (int) ( is_array( $existing ) ? $existing['term_id'] : $existing );
		}
		return array_values( array_unique( array_filter( $ids ) ) );
	}

	private function editorial_base64_image( $cover, $post_id ) {
		$data = isset( $cover['data'] ) ? $cover['data'] : null;
		if ( ! is_string( $data ) || '' === $data ) {
			return $this->editorial_error( 'kadochi_editorial_cover_required', __( 'cover.data is required when no cover.url is supplied.', 'kadochi-core' ) );
		}
		if ( 0 === strpos( $data, 'data:' ) ) {
			$parts = explode( ',', $data, 2 );
			$data = isset( $parts[1] ) ? $parts[1] : '';
		}
		$binary = base64_decode( $data, true );
		if ( false === $binary || '' === $binary || strlen( $binary ) > self::EDITORIAL_MAX_IMAGE_BYTES ) {
			return $this->editorial_error( 'kadochi_editorial_invalid_cover', __( 'The cover image is invalid or too large.', 'kadochi-core' ) );
		}
		$details = function_exists( 'getimagesizefromstring' ) ? getimagesizefromstring( $binary ) : false;
		$extensions = array( 'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp' );
		$mime = is_array( $details ) && isset( $details['mime'] ) ? $details['mime'] : '';
		if ( ! isset( $extensions[ $mime ] ) ) {
			return $this->editorial_error( 'kadochi_editorial_cover_type', __( 'The cover must be a JPEG, PNG, or WebP image.', 'kadochi-core' ) );
		}
		$filename = isset( $cover['filename'] ) && is_string( $cover['filename'] ) ? sanitize_file_name( $cover['filename'] ) : 'kadochi-cover.' . $extensions[ $mime ];
		if ( '' === $filename ) {
			$filename = 'kadochi-cover.' . $extensions[ $mime ];
		}
		$upload = wp_upload_bits( $filename, null, $binary );
		if ( ! empty( $upload['error'] ) ) {
			return $this->editorial_error( 'kadochi_editorial_cover_upload', __( 'The cover image could not be saved.', 'kadochi-core' ), 500 );
		}
		require_once ABSPATH . 'wp-admin/includes/image.php';
		$attachment_id = wp_insert_attachment( array(
			'post_mime_type' => $mime,
			'post_title' => sanitize_text_field( pathinfo( $filename, PATHINFO_FILENAME ) ),
			'post_status' => 'inherit',
		), $upload['file'], $post_id );
		if ( is_wp_error( $attachment_id ) || ! $attachment_id ) {
			return $this->editorial_error( 'kadochi_editorial_cover_attachment', __( 'The cover attachment could not be created.', 'kadochi-core' ), 500 );
		}
		wp_update_attachment_metadata( $attachment_id, wp_generate_attachment_metadata( $attachment_id, $upload['file'] ) );
		return (int) $attachment_id;
	}

	private function editorial_cover( $cover, $post_id ) {
		if ( ! is_array( $cover ) ) {
			return $this->editorial_error( 'kadochi_editorial_cover_required', __( 'A cover image is required.', 'kadochi-core' ) );
		}
		$alt = $this->editorial_string( isset( $cover['alt'] ) ? $cover['alt'] : null, 'cover alt', 1, 180 );
		if ( is_wp_error( $alt ) ) {
			return $alt;
		}
		if ( ! empty( $cover['url'] ) ) {
			$url = esc_url_raw( (string) $cover['url'] );
			if ( ! wp_http_validate_url( $url ) ) {
				return $this->editorial_error( 'kadochi_editorial_cover_url', __( 'cover.url must be a valid public HTTP URL.', 'kadochi-core' ) );
			}
			require_once ABSPATH . 'wp-admin/includes/media.php';
			require_once ABSPATH . 'wp-admin/includes/file.php';
			require_once ABSPATH . 'wp-admin/includes/image.php';
			$attachment_id = media_sideload_image( $url, $post_id, $alt, 'id' );
		} else {
			$attachment_id = $this->editorial_base64_image( $cover, $post_id );
		}
		if ( is_wp_error( $attachment_id ) ) {
			return $attachment_id;
		}
		update_post_meta( (int) $attachment_id, '_wp_attachment_image_alt', sanitize_text_field( $alt ) );
		return (int) $attachment_id;
	}

	private function editorial_revalidate() {
		$url = getenv( 'KADOCHI_FRONTEND_REVALIDATE_URL' );
		$secret = getenv( 'KADOCHI_REVALIDATE_SECRET' );
		if ( ! is_string( $url ) || '' === trim( $url ) || ! is_string( $secret ) || '' === trim( $secret ) ) {
			return;
		}
		wp_remote_post( $url, array(
			'timeout' => 5,
			'headers' => array( 'Content-Type' => 'application/json', 'X-Kadochi-Revalidate-Key' => $secret ),
			'body' => wp_json_encode( array( 'tags' => array( 'magazine-articles', 'magazine-categories' ) ) ),
		) );
	}

	/** Creates a Post, terms, attachment, and featured image in one request. */
	public function create_editorial_article( WP_REST_Request $request ) {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) ) {
			return $this->editorial_error( 'kadochi_editorial_invalid_json', __( 'The request body must be a JSON object.', 'kadochi-core' ) );
		}
		$title = $this->editorial_string( isset( $input['title'] ) ? $input['title'] : null, 'title', 1, 180 );
		$content = $this->editorial_string( isset( $input['content'] ) ? $input['content'] : null, 'content', 1, 100000 );
		$idempotency_key = $this->editorial_string( isset( $input['idempotencyKey'] ) ? $input['idempotencyKey'] : null, 'idempotencyKey', 8, 128 );
		if ( is_wp_error( $title ) || is_wp_error( $content ) || is_wp_error( $idempotency_key ) ) {
			return is_wp_error( $title ) ? $title : ( is_wp_error( $content ) ? $content : $idempotency_key );
		}
		$existing = get_posts( array( 'post_type' => 'post', 'post_status' => 'any', 'meta_key' => '_kadochi_editorial_idempotency_key', 'meta_value' => $idempotency_key, 'fields' => 'ids', 'numberposts' => 1 ) );
		if ( ! empty( $existing ) ) {
			$post_id = (int) $existing[0];
			return rest_ensure_response( array( 'created' => false, 'postId' => $post_id, 'status' => get_post_status( $post_id ), 'editUrl' => admin_url( 'post.php?post=' . $post_id . '&action=edit' ), 'url' => get_permalink( $post_id ) ) );
		}
		$status = isset( $input['status'] ) ? sanitize_key( (string) $input['status'] ) : 'draft';
		if ( ! in_array( $status, array( 'draft', 'publish' ), true ) ) {
			return $this->editorial_error( 'kadochi_editorial_invalid_status', __( 'status must be draft or publish.', 'kadochi-core' ) );
		}
		$slug = isset( $input['slug'] ) && '' !== trim( (string) $input['slug'] ) ? sanitize_title( (string) $input['slug'] ) : sanitize_title( $title );
		if ( '' === $slug ) {
			return $this->editorial_error( 'kadochi_editorial_invalid_slug', __( 'A valid slug is required.', 'kadochi-core' ) );
		}
		$categories = $this->editorial_terms( isset( $input['categories'] ) ? $input['categories'] : array(), 'category', 5 );
		$tags = $this->editorial_terms( isset( $input['tags'] ) ? $input['tags'] : array(), 'post_tag', 12 );
		if ( is_wp_error( $categories ) || is_wp_error( $tags ) ) {
			return is_wp_error( $categories ) ? $categories : $tags;
		}
		$excerpt = isset( $input['excerpt'] ) ? $this->editorial_string( $input['excerpt'], 'excerpt', 0, 500, false ) : '';
		if ( is_wp_error( $excerpt ) ) {
			return $excerpt;
		}
		$post_id = wp_insert_post( array(
			'post_type' => 'post',
			'post_status' => 'draft',
			'post_title' => sanitize_text_field( $title ),
			'post_name' => $slug,
			'post_content' => wp_kses_post( $content ),
			'post_excerpt' => sanitize_textarea_field( $excerpt ),
			'post_category' => $categories,
		), true );
		if ( is_wp_error( $post_id ) ) {
			return $this->editorial_error( 'kadochi_editorial_post_failed', __( 'The article could not be created.', 'kadochi-core' ), 500 );
		}
		wp_set_object_terms( $post_id, $tags, 'post_tag', false );
		update_post_meta( $post_id, '_kadochi_editorial_idempotency_key', $idempotency_key );
		$attachment_id = $this->editorial_cover( isset( $input['cover'] ) ? $input['cover'] : null, $post_id );
		if ( is_wp_error( $attachment_id ) ) {
			wp_delete_post( $post_id, true );
			return $attachment_id;
		}
		set_post_thumbnail( $post_id, $attachment_id );
		if ( 'publish' === $status ) {
			wp_update_post( array( 'ID' => $post_id, 'post_status' => 'publish' ) );
		}
		$this->editorial_revalidate();
		$response = rest_ensure_response( array( 'created' => true, 'postId' => (int) $post_id, 'mediaId' => $attachment_id, 'status' => $status, 'editUrl' => admin_url( 'post.php?post=' . $post_id . '&action=edit' ), 'url' => get_permalink( $post_id ) ) );
		$response->set_status( 201 );
		return $response;
	}

	public function authenticated() {
		return current_user_can( 'read' ) ? true : new WP_Error( 'kadochi_unauthenticated', __( 'Authentication is required.', 'kadochi-core' ), array( 'status' => 401 ) );
	}

	public function public_auth_request() {
		return true;
	}

	private function phone_route_arg() {
		return array(
			'required' => true,
			'type' => 'string',
			'sanitize_callback' => array( $this, 'sanitize_phone_param' ),
			'validate_callback' => array( $this, 'validate_phone_param' ),
		);
	}

	private function code_route_arg() {
		return array(
			'required' => true,
			'type' => 'string',
			'sanitize_callback' => array( $this, 'sanitize_code_param' ),
			'validate_callback' => array( $this, 'validate_code_param' ),
		);
	}

	private function latin_digits( $value ) {
		return strtr( $value, array( '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9', '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9' ) );
	}

	private function canonical_phone( $value ) {
		if ( ! is_string( $value ) ) {
			return null;
		}
		$phone = preg_replace( '/[\s\-()]+/', '', $this->latin_digits( trim( $value ) ) );
		if ( preg_match( '/^09\d{9}$/', $phone ) ) {
			return '+98' . substr( $phone, 1 );
		}
		if ( preg_match( '/^00989\d{9}$/', $phone ) ) {
			return '+' . substr( $phone, 2 );
		}
		return preg_match( '/^\+989\d{9}$/', $phone ) ? $phone : null;
	}

	private function national_phone( $canonical_phone ) {
		return '0' . substr( $canonical_phone, 3 );
	}

	public function sanitize_phone_param( $value ) {
		return $this->canonical_phone( $value ) ?: '';
	}

	public function validate_phone_param( $value ) {
		return null !== $this->canonical_phone( $value );
	}

	public function sanitize_code_param( $value ) {
		return is_string( $value ) ? $this->latin_digits( trim( $value ) ) : '';
	}

	public function validate_code_param( $value ) {
		return is_string( $value ) && (bool) preg_match( '/^\d{4,6}$/', $this->latin_digits( trim( $value ) ) );
	}

	private function auth_error( $code, $message, $status, $data = array() ) {
		return new WP_Error( $code, $message, array_merge( array( 'status' => $status ), is_array( $data ) ? $data : array() ) );
	}

	/**
	 * Counts user-entered text without splitting multibyte characters such as
	 * Persian letters. `wp_strlen()` is not a WordPress core function, so keep
	 * a small fallback for hosts without the mbstring extension.
	 */
	private function string_length( $value ) {
		$value = (string) $value;
		return function_exists( 'mb_strlen' ) ? mb_strlen( $value, 'UTF-8' ) : strlen( $value );
	}

	private function local_auth_enabled() {
		$environment = defined( 'WP_ENVIRONMENT_TYPE' ) ? wp_get_environment_type() : getenv( 'WP_ENVIRONMENT_TYPE' );
		return in_array( $environment, array( 'local', 'development' ), true );
	}

	private function transient_key( $scope, $value ) {
		return 'kadochi_' . $scope . '_' . hash( 'sha256', $value );
	}

	private function challenge_key( $phone ) {
		return $this->transient_key( 'otp_challenge', $phone );
	}

	private function rate_key( $scope, $value ) {
		return $this->transient_key( 'otp_rate_' . $scope, $value );
	}

	private function counter_state( $key, $now = null ) {
		$now = null === $now ? time() : (int) $now;
		$value = get_transient( $key );
		if ( ! is_array( $value ) || ! isset( $value['count'], $value['expiresAt'] ) || (int) $value['expiresAt'] <= $now ) {
			return array( 'count' => 0, 'expiresAt' => $now + HOUR_IN_SECONDS );
		}
		return array( 'count' => max( 0, (int) $value['count'] ), 'expiresAt' => (int) $value['expiresAt'] );
	}

	private function counter_value( $key ) {
		$state = $this->counter_state( $key );
		return (int) $state['count'];
	}

	private function counter_retry_after( $key ) {
		$state = $this->counter_state( $key );
		return max( 1, (int) $state['expiresAt'] - time() );
	}

	private function increment_counter( $key, $ttl ) {
		$now = time();
		$state = $this->counter_state( $key, $now );
		$count = (int) $state['count'] + 1;
		$expires_at = max( $now + 1, min( (int) $state['expiresAt'], $now + max( 1, (int) $ttl ) ) );
		return set_transient( $key, array( 'count' => $count, 'expiresAt' => $expires_at ), $expires_at - $now ) ? $count : false;
	}

	private function otp_lock_name( $scope, $value ) {
		return 'kadochi_otp_' . substr( hash( 'sha256', $scope . "\0" . $value ), 0, 52 );
	}

	/** MySQL named locks serialize challenge/counter mutations across PHP workers. */
	private function acquire_otp_lock( $scope, $value, $timeout = 0 ) {
		global $wpdb;
		$result = $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, %d)', $this->otp_lock_name( $scope, $value ), max( 0, (int) $timeout ) ) );
		if ( null === $result ) {
			$this->otp_log( 'otp_lock_failed', array( 'failureCategory' => 'database', 'lockScope' => $scope ) );
			return null;
		}
		return 1 === (int) $result;
	}

	private function release_otp_lock( $scope, $value ) {
		global $wpdb;
		$result = $wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $this->otp_lock_name( $scope, $value ) ) );
		if ( 1 !== (int) $result ) {
			$this->otp_log( 'otp_lock_release_failed', array( 'failureCategory' => 'database', 'lockScope' => $scope ) );
		}
	}

	/** Deletes security state and confirms it is no longer readable. */
	private function delete_transient_confirmed( $key ) {
		delete_transient( $key );
		return false === get_transient( $key );
	}

	private function otp_internal_request_auth( WP_REST_Request $request, $purpose, $payload ) {
		$secret = trim( (string) getenv( 'KADOCHI_INTERNAL_API_SECRET' ) );
		if ( ! is_string( $secret ) || strlen( $secret ) < 32 ) {
			$this->otp_log( 'internal_auth_failed', array( 'failureCategory' => 'configuration' ) );
			return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
		}
		$timestamp = trim( (string) $request->get_header( 'X-Kadochi-Internal-Timestamp' ) );
		$signature = strtolower( trim( (string) $request->get_header( 'X-Kadochi-Internal-Auth' ) ) );
		$request_id = $this->otp_request_id();
		if ( ! preg_match( '/^\d{10}$/', $timestamp ) || abs( time() - (int) $timestamp ) > self::OTP_INTERNAL_AUTH_SKEW_SECONDS || 'unknown' === $request_id || ! preg_match( '/^[a-f0-9]{64}$/', $signature ) ) {
			$this->otp_log( 'internal_auth_failed', array( 'failureCategory' => 'invalid_headers' ) );
			return $this->auth_error( 'kadochi_internal_request_required', __( 'The request is not authorized.', 'kadochi-core' ), 403 );
		}
		$message = "kadochi-internal-v1\n" . $purpose . "\n" . $timestamp . "\n" . $request_id . "\n" . $payload;
		$expected = hash_hmac( 'sha256', $message, $secret );
		if ( ! hash_equals( $expected, $signature ) ) {
			$this->otp_log( 'internal_auth_failed', array( 'failureCategory' => 'signature' ) );
			return $this->auth_error( 'kadochi_internal_request_required', __( 'The request is not authorized.', 'kadochi-core' ), 403 );
		}
		return true;
	}

	private function otp_digest( $phone, $code ) {
		return hash_hmac( 'sha256', 'kadochi-otp-v1:' . $phone . ':' . $code, $this->jwt_key() );
	}

	/** Returns a correlation id suitable for logs and relay headers, never customer data. */
	private function otp_request_id() {
		$value = isset( $_SERVER['HTTP_X_REQUEST_ID'] ) ? (string) $_SERVER['HTTP_X_REQUEST_ID'] : '';
		$value = preg_replace( '/[^A-Za-z0-9._:-]/', '', sanitize_text_field( $value ) );
		return substr( $value, 0, 128 ) ?: 'unknown';
	}

	/** Logs only operational OTP metadata; callers must never pass phone numbers or codes. */
	private function otp_log( $event, $context = array() ) {
		$payload = array_merge( array( 'event' => $event, 'requestId' => $this->otp_request_id() ), $context );
		error_log( '[kadochi-otp] ' . wp_json_encode( $payload ) ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}

	private function otp_response( $challenge, $now = null ) {
		$now = null === $now ? time() : (int) $now;
		return array(
			'expiresIn' => max( 0, (int) $challenge['expiresAt'] - $now ),
			'retryAfter' => max( 0, (int) $challenge['retryAt'] - $now ),
			'codeLength' => (int) $challenge['codeLength'],
		);
	}

	/** Finds a challenge that can be recovered without sending a second SMS. */
	private function recoverable_otp_challenge( $phone, $now = null ) {
		$now = null === $now ? time() : (int) $now;
		$challenge_key = $this->challenge_key( $phone );
		$challenge = get_transient( $challenge_key );
		if ( ! is_array( $challenge ) || empty( $challenge['digest'] ) || empty( $challenge['expiresAt'] ) || empty( $challenge['retryAt'] ) || empty( $challenge['codeLength'] ) ) {
			return null;
		}
		if ( (int) $challenge['expiresAt'] <= $now ) {
			delete_transient( $challenge_key );
			return null;
		}
		$code_length = (int) $challenge['codeLength'];
		return (int) $challenge['retryAt'] > $now && $code_length >= 4 && $code_length <= 6 ? $challenge : null;
	}

	/** Extracts codes only from the documented relay response fields. */
	private function relay_payload_code( $payload, &$shape ) {
		$shape = is_array( $payload ) ? 'object' : 'non_object';
		$candidates = array();
		if ( is_array( $payload ) && array_key_exists( 'code', $payload ) ) {
			$candidates[] = array( 'value' => $payload['code'], 'shape' => 'code' );
		}
		if ( is_array( $payload ) && isset( $payload['data'] ) && is_array( $payload['data'] ) ) {
			if ( array_key_exists( 'code', $payload['data'] ) ) {
				$candidates[] = array( 'value' => $payload['data']['code'], 'shape' => 'data.code' );
			}
			if ( array_key_exists( 'otp', $payload['data'] ) ) {
				$candidates[] = array( 'value' => $payload['data']['otp'], 'shape' => 'data.otp' );
			}
		}
		foreach ( $candidates as $candidate ) {
			$value = $candidate['value'];
			if ( ! is_string( $value ) && ! is_int( $value ) && ! is_float( $value ) ) {
				$shape = $candidate['shape'] . ':invalid_type';
				continue;
			}
			$shape = $candidate['shape'] . ':' . ( is_string( $value ) ? 'string' : 'number' );
			$code = trim( $this->latin_digits( (string) $value ) );
			if ( preg_match( '/^\d{4,6}$/', $code ) ) {
				return $code;
			}
		}
		return '';
	}

	private function relay_code( $phone ) {
		$url = getenv( 'MELIPAYAMAK_OTP_URL' );
		if ( ! is_string( $url ) || '' === trim( $url ) ) {
			$this->otp_log( 'relay_unavailable', array( 'status' => 0, 'durationMs' => 0, 'responseShape' => 'not_requested', 'failureCategory' => 'configuration' ) );
			return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
		}
		$started_at = microtime( true );
		$response = wp_remote_post( $url, array(
			'timeout' => 8,
			'headers' => array( 'Accept' => 'application/json', 'Content-Type' => 'application/json', 'X-Request-ID' => $this->otp_request_id() ),
			'body' => wp_json_encode( array( 'to' => $this->national_phone( $phone ) ) ),
		) );
		$duration_ms = (int) round( ( microtime( true ) - $started_at ) * 1000 );
		if ( is_wp_error( $response ) ) {
			$is_timeout = (bool) preg_match( '/time(?:d)?\s*out|timeout/i', $response->get_error_message() );
			$failure_category = $is_timeout ? 'timeout' : 'network';
			$this->otp_log( $is_timeout ? 'relay_timed_out' : 'relay_failed', array( 'status' => 0, 'durationMs' => $duration_ms, 'responseShape' => 'none', 'failureCategory' => $failure_category ) );
			return $this->auth_error( $is_timeout ? 'kadochi_otp_provider_timeout' : 'kadochi_otp_provider_network', __( 'The SMS service is unavailable.', 'kadochi-core' ), $is_timeout ? 504 : 502 );
		}
		$status = (int) wp_remote_retrieve_response_code( $response );
		if ( $status < 200 || $status >= 300 ) {
			$this->otp_log( 'relay_failed', array( 'status' => $status, 'durationMs' => $duration_ms, 'responseShape' => 'not_read', 'failureCategory' => 'http_status' ) );
			return $this->auth_error( 'kadochi_otp_provider_failed', __( 'The SMS service is unavailable.', 'kadochi-core' ), 502 );
		}
		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		$shape = 'unknown';
		$code = $this->relay_payload_code( $payload, $shape );
		if ( '' === $code ) {
			$this->otp_log( 'relay_invalid_contract', array( 'status' => $status, 'durationMs' => $duration_ms, 'responseShape' => $shape, 'failureCategory' => 'invalid_contract' ) );
			return $this->auth_error( 'kadochi_otp_provider_invalid', __( 'The SMS service returned an invalid response.', 'kadochi-core' ), 502 );
		}
		$this->otp_log( 'relay_completed', array( 'status' => $status, 'durationMs' => $duration_ms, 'responseShape' => $shape, 'failureCategory' => 'none' ) );
		return $code;
	}

	public function start_otp( WP_REST_Request $request ) {
		$phone = $request->get_param( 'phone' );
		$this->otp_log( 'otp_start_received' );
		if ( $this->local_auth_enabled() ) {
			if ( '+989121234567' !== $phone ) {
				return $this->auth_error( 'kadochi_local_phone_required', __( 'Use the local development phone number.', 'kadochi-core' ), 400 );
			}
			return rest_ensure_response( array( 'expiresIn' => self::OTP_TTL_SECONDS, 'retryAfter' => self::OTP_RESEND_SECONDS, 'codeLength' => 4 ) );
		}

		$internal_auth = $this->otp_internal_request_auth( $request, 'otp-start', $phone );
		if ( is_wp_error( $internal_auth ) ) {
			return $internal_auth;
		}
		$phone_rate_key = $this->rate_key( 'phone', $phone );
		$global_rate_key = $this->rate_key( 'global', 'otp-start' );
		$phone_lock = $this->acquire_otp_lock( 'phone', $phone );
		if ( null === $phone_lock ) {
			return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
		}
		if ( ! $phone_lock ) {
			$this->otp_log( 'otp_start_in_progress' );
			return $this->auth_error( 'kadochi_otp_cooldown', __( 'A verification-code request is already in progress.', 'kadochi-core' ), 429, array( 'retryAfter' => 3 ) );
		}

		try {
			$challenge = $this->recoverable_otp_challenge( $phone );
			if ( is_array( $challenge ) ) {
				$this->otp_log( 'existing_challenge_recovered' );
				return rest_ensure_response( $this->otp_response( $challenge ) );
			}
			$phone_count = $this->counter_value( $phone_rate_key );
			if ( $phone_count >= self::OTP_SEND_LIMIT_PER_HOUR ) {
				$this->otp_log( 'hourly_limit_reached' );
				return $this->auth_error( 'kadochi_otp_rate_limited', __( 'Too many verification-code requests. Please try again later.', 'kadochi-core' ), 429, array( 'retryAfter' => $this->counter_retry_after( $phone_rate_key ) ) );
			}

			// The deployment is behind a CDN whose client-IP header contract is not
			// controlled here. A global circuit breaker is deterministic and avoids
			// both spoofable IP limits and carrier-NAT false positives.
			$global_lock = $this->acquire_otp_lock( 'global', 'otp-start', 1 );
			if ( null === $global_lock ) {
				return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
			}
			if ( ! $global_lock ) {
				$this->otp_log( 'otp_start_global_busy' );
				return $this->auth_error( 'kadochi_otp_cooldown', __( 'A verification-code request is already in progress.', 'kadochi-core' ), 429, array( 'retryAfter' => 2 ) );
			}
			try {
				if ( $this->counter_value( $global_rate_key ) >= self::OTP_GLOBAL_ATTEMPT_LIMIT_PER_HOUR ) {
					$this->otp_log( 'hourly_limit_reached' );
					return $this->auth_error( 'kadochi_otp_rate_limited', __( 'Too many verification-code requests. Please try again later.', 'kadochi-core' ), 429, array( 'retryAfter' => $this->counter_retry_after( $global_rate_key ) ) );
				}
				if ( false === $this->increment_counter( $global_rate_key, HOUR_IN_SECONDS ) ) {
					$this->otp_log( 'rate_counter_store_failed' );
					return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
				}
			} finally {
				$this->release_otp_lock( 'global', 'otp-start' );
			}

			if ( false === $this->increment_counter( $phone_rate_key, HOUR_IN_SECONDS ) ) {
				$this->otp_log( 'rate_counter_store_failed' );
				return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
			}

			$code = $this->relay_code( $phone );
			if ( is_wp_error( $code ) ) {
				return $code;
			}
			$now = time();
			$challenge = array( 'digest' => $this->otp_digest( $phone, $code ), 'attempts' => 0, 'codeLength' => strlen( $code ), 'expiresAt' => $now + self::OTP_TTL_SECONDS, 'retryAt' => $now + self::OTP_RESEND_SECONDS );
			if ( ! set_transient( $this->challenge_key( $phone ), $challenge, self::OTP_TTL_SECONDS ) ) {
				$this->otp_log( 'challenge_store_failed' );
				return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
			}
			$this->otp_log( 'challenge_stored' );
			return rest_ensure_response( $this->otp_response( $challenge, $now ) );
		} finally {
			$this->release_otp_lock( 'phone', $phone );
		}
	}

	private function invalid_otp() {
		return $this->auth_error( 'kadochi_invalid_otp', __( 'The verification code is incorrect or has expired.', 'kadochi-core' ), 401 );
	}

	private function verify_stored_otp( $phone, $code ) {
		$challenge_key = $this->challenge_key( $phone );
		$challenge = get_transient( $challenge_key );
		if ( ! is_array( $challenge ) || empty( $challenge['digest'] ) || empty( $challenge['expiresAt'] ) || (int) $challenge['expiresAt'] <= time() ) {
			delete_transient( $challenge_key );
			return $this->invalid_otp();
		}
		if ( ! hash_equals( (string) $challenge['digest'], $this->otp_digest( $phone, $code ) ) ) {
			$attempts = (int) ( isset( $challenge['attempts'] ) ? $challenge['attempts'] : 0 ) + 1;
			if ( $attempts >= self::OTP_MAX_ATTEMPTS ) {
				if ( ! $this->delete_transient_confirmed( $challenge_key ) ) {
					$this->otp_log( 'challenge_state_failed', array( 'failureCategory' => 'attempt_consume' ) );
					return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
				}
			} else {
				$challenge['attempts'] = $attempts;
				if ( ! set_transient( $challenge_key, $challenge, max( 1, (int) $challenge['expiresAt'] - time() ) ) ) {
					$this->delete_transient_confirmed( $challenge_key );
					$this->otp_log( 'challenge_state_failed', array( 'failureCategory' => 'attempt_update' ) );
					return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
				}
			}
			return $this->invalid_otp();
		}
		return true;
	}

	private function first_user_with_meta( $key, $value ) {
		$users = get_users( array( 'number' => 1, 'fields' => 'ids', 'meta_key' => $key, 'meta_value' => $value ) );
		return ! empty( $users ) ? (int) $users[0] : 0;
	}

	private function customer_email( $phone ) {
		return preg_replace( '/\D/', '', $phone ) . '@customer.kadochi.invalid';
	}

	private function resolve_customer( $phone ) {
		$national_phone = $this->national_phone( $phone );
		$is_new_customer = false;
		$user_id = $this->first_user_with_meta( 'kadochi_phone', $phone ) ?: $this->first_user_with_meta( 'billing_phone', $national_phone );
		if ( ! $user_id ) {
			$user_id = (int) username_exists( $national_phone );
		}
		if ( ! $user_id ) {
			$user_id = (int) username_exists( $phone );
		}
		if ( ! $user_id ) {
			$user_id = (int) email_exists( $this->customer_email( $phone ) );
		}
		if ( ! $user_id ) {
			if ( ! function_exists( 'wc_create_new_customer' ) ) {
				return $this->auth_error( 'kadochi_customer_unavailable', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
			}
			$user_id = wc_create_new_customer( $this->customer_email( $phone ), $national_phone, wp_generate_password( 32, true, true ) );
			if ( is_wp_error( $user_id ) ) {
				return $this->auth_error( 'kadochi_customer_create_failed', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
			}
			$user_id = (int) $user_id;
			$is_new_customer = true;
		}
		update_user_meta( $user_id, 'kadochi_phone', $phone );
		update_user_meta( $user_id, 'billing_phone', $national_phone );
		if ( $is_new_customer ) {
			$this->create_notification( $user_id, 'welcome', 'welcome', 'به کادوچی خوش آمدید.' );
		}
		return $user_id;
	}

	private function customer_dto( $user_id ) {
		$user = get_user_by( 'id', (int) $user_id );
		if ( ! $user ) {
			return null;
		}
		$first_name = sanitize_text_field( get_user_meta( $user->ID, 'first_name', true ) ?: get_user_meta( $user->ID, 'billing_first_name', true ) );
		$last_name = sanitize_text_field( get_user_meta( $user->ID, 'last_name', true ) ?: get_user_meta( $user->ID, 'billing_last_name', true ) );
		$phone = $this->canonical_phone( get_user_meta( $user->ID, 'kadochi_phone', true ) ) ?: $this->canonical_phone( get_user_meta( $user->ID, 'billing_phone', true ) );
		if ( ! $phone ) {
			return null;
		}
		$display_name = trim( $first_name . ' ' . $last_name );
		if ( '' === $display_name ) {
			$display_name = sanitize_text_field( $user->display_name );
		}
		if ( '' === $display_name ) {
			$display_name = sanitize_text_field( $user->user_login );
		}
		return array(
			'id' => (int) $user->ID,
			'email' => sanitize_email( $user->user_email ),
			'displayName' => $display_name,
			'firstName' => $first_name,
			'lastName' => $last_name,
			'avatarSrc' => $this->customer_avatar_url( $user->ID ),
			'birthDate' => $this->customer_birth_date( $user->ID ),
			'gender' => $this->customer_gender( $user->ID ),
			'phone' => $phone,
			'roles' => array_values( $user->roles ),
		);
	}

	private function valid_customer_birth_date( $value ) {
		if ( ! is_string( $value ) || ! preg_match( '/^(\\d{4})-(\\d{2})-(\\d{2})$/D', $value, $matches ) ) {
			return false;
		}
		return (int) $matches[1] >= 1900 && $value <= gmdate( 'Y-m-d' ) && checkdate( (int) $matches[2], (int) $matches[3], (int) $matches[1] );
	}

	private function customer_birth_date( $user_id ) {
		$value = get_user_meta( (int) $user_id, 'kadochi_birth_date', true );
		return $this->valid_customer_birth_date( $value ) ? $value : null;
	}

	private function customer_gender( $user_id ) {
		$value = get_user_meta( (int) $user_id, 'kadochi_gender', true );
		return in_array( $value, array( 'female', 'male', 'undisclosed' ), true ) ? $value : null;
	}

	private function customer_gender_label( $gender ) {
		$labels = array(
			'female'     => __( 'Female', 'kadochi-core' ),
			'male'       => __( 'Male', 'kadochi-core' ),
			'undisclosed' => __( 'Prefer not to say', 'kadochi-core' ),
		);
		return isset( $labels[ $gender ] ) ? $labels[ $gender ] : '';
	}

	/** Returns only the image managed by this plugin, never a third-party avatar URL. */
	private function customer_avatar_url( $user_id ) {
		$attachment_id = absint( get_user_meta( (int) $user_id, 'kadochi_avatar_attachment_id', true ) );
		if ( ! $attachment_id || ! function_exists( 'wp_get_attachment_url' ) ) {
			return null;
		}
		$url = wp_get_attachment_url( $attachment_id );
		return is_string( $url ) && '' !== $url ? esc_url_raw( $url ) : null;
	}

	/** Resolves WordPress's flexible avatar argument to a local user ID when possible. */
	private function avatar_user_id( $id_or_email ) {
		if ( $id_or_email instanceof WP_User ) {
			return (int) $id_or_email->ID;
		}
		if ( $id_or_email instanceof WP_Comment ) {
			return (int) $id_or_email->user_id;
		}
		if ( is_object( $id_or_email ) && isset( $id_or_email->user_id ) ) {
			return absint( $id_or_email->user_id );
		}
		if ( is_numeric( $id_or_email ) ) {
			return absint( $id_or_email );
		}
		if ( is_string( $id_or_email ) && is_email( $id_or_email ) ) {
			return (int) email_exists( $id_or_email );
		}
		return 0;
	}

	/** Uses the image uploaded in Kadochi wherever WordPress requests this user's avatar. */
	public function customer_avatar_url_filter( $url, $id_or_email, $args ) {
		$user_id = $this->avatar_user_id( $id_or_email );
		$avatar = $user_id ? $this->customer_avatar_url( $user_id ) : null;
		return $avatar ?: $url;
	}

	/**
	 * Stores a pre-cropped JPEG submitted by the account owner. The API accepts
	 * data URLs so the BFF can keep using its existing JSON-only authenticated
	 * profile update route.
	 */
	private function save_customer_avatar( $user_id, $avatar_data ) {
		if ( ! is_string( $avatar_data ) || ! preg_match( '/^data:image\\/jpeg;base64,([A-Za-z0-9+\\/=]+)$/D', $avatar_data, $matches ) ) {
			return new WP_Error( 'kadochi_invalid_avatar', __( 'Avatar image is invalid.', 'kadochi-core' ) );
		}

		$binary = base64_decode( $matches[1], true );
		if ( false === $binary || strlen( $binary ) < 100 || strlen( $binary ) > 1100000 ) {
			return new WP_Error( 'kadochi_invalid_avatar', __( 'Avatar image is invalid.', 'kadochi-core' ) );
		}

		$image_size = function_exists( 'getimagesizefromstring' ) ? @getimagesizefromstring( $binary ) : false;
		if ( ! is_array( $image_size ) || ! isset( $image_size[0], $image_size[1], $image_size[2] ) || IMAGETYPE_JPEG !== $image_size[2] || $image_size[0] < 1 || $image_size[1] < 1 || $image_size[0] > 2048 || $image_size[1] > 2048 ) {
			return new WP_Error( 'kadochi_invalid_avatar', __( 'Avatar image is invalid.', 'kadochi-core' ) );
		}

		$filename = 'kadochi-avatar-' . absint( $user_id ) . '-' . wp_generate_password( 12, false, false ) . '.jpg';
		$upload = wp_upload_bits( $filename, null, $binary );
		if ( ! empty( $upload['error'] ) || empty( $upload['file'] ) || empty( $upload['url'] ) ) {
			return new WP_Error( 'kadochi_avatar_upload_failed', __( 'Avatar image could not be saved.', 'kadochi-core' ) );
		}

		require_once ABSPATH . 'wp-admin/includes/image.php';
		$attachment_id = wp_insert_attachment( array(
			'post_mime_type' => 'image/jpeg',
			'post_title' => sanitize_file_name( pathinfo( $filename, PATHINFO_FILENAME ) ),
			'post_content' => '',
			'post_status' => 'inherit',
		), $upload['file'] );
		if ( is_wp_error( $attachment_id ) || ! $attachment_id ) {
			@unlink( $upload['file'] );
			return new WP_Error( 'kadochi_avatar_upload_failed', __( 'Avatar image could not be saved.', 'kadochi-core' ) );
		}

		$metadata = wp_generate_attachment_metadata( $attachment_id, $upload['file'] );
		if ( is_array( $metadata ) ) {
			wp_update_attachment_metadata( $attachment_id, $metadata );
		}
		update_post_meta( $attachment_id, '_kadochi_customer_avatar', (int) $user_id );

		$previous_attachment_id = absint( get_user_meta( (int) $user_id, 'kadochi_avatar_attachment_id', true ) );
		update_user_meta( (int) $user_id, 'kadochi_avatar_attachment_id', $attachment_id );
		if ( $previous_attachment_id && $previous_attachment_id !== $attachment_id && (int) get_post_meta( $previous_attachment_id, '_kadochi_customer_avatar', true ) === (int) $user_id ) {
			wp_delete_attachment( $previous_attachment_id, true );
		}

		return $attachment_id;
	}

	private function remove_customer_avatar( $user_id ) {
		$attachment_id = absint( get_user_meta( (int) $user_id, 'kadochi_avatar_attachment_id', true ) );
		delete_user_meta( (int) $user_id, 'kadochi_avatar_attachment_id' );
		if ( $attachment_id && (int) get_post_meta( $attachment_id, '_kadochi_customer_avatar', true ) === (int) $user_id ) {
			wp_delete_attachment( $attachment_id, true );
		}
	}

	private function saved_customer_address_dto( $address ) {
		if ( ! is_array( $address ) || empty( $address['id'] ) || ! is_string( $address['id'] ) || ! preg_match( '/^[a-f0-9-]{36}$/i', $address['id'] ) ) {
			return null;
		}
		$title = isset( $address['title'] ) && is_string( $address['title'] ) ? sanitize_text_field( $address['title'] ) : '';
		$address_1 = isset( $address['address1'] ) && is_string( $address['address1'] ) ? sanitize_text_field( $address['address1'] ) : '';
		$address_2 = isset( $address['address2'] ) && is_string( $address['address2'] ) ? sanitize_text_field( $address['address2'] ) : '';
		if ( '' === $title || '' === $address_1 ) {
			return null;
		}
		$location = null;
		if ( isset( $address['location'] ) && is_array( $address['location'] ) && isset( $address['location']['latitude'], $address['location']['longitude'] ) && is_numeric( $address['location']['latitude'] ) && is_numeric( $address['location']['longitude'] ) ) {
			$latitude = (float) $address['location']['latitude'];
			$longitude = (float) $address['location']['longitude'];
			if ( $latitude >= -90 && $latitude <= 90 && $longitude >= -180 && $longitude <= 180 ) {
				$location = array( 'latitude' => $latitude, 'longitude' => $longitude );
			}
		}
		return array( 'id' => $address['id'], 'title' => $title, 'address1' => $address_1, 'address2' => $address_2, 'location' => $location );
	}

	private function saved_customer_addresses( $user_id ) {
		$stored = get_user_meta( (int) $user_id, 'kadochi_saved_addresses', true );
		if ( ! is_array( $stored ) ) {
			return array();
		}
		$addresses = array();
		foreach ( $stored as $address ) {
			$dto = $this->saved_customer_address_dto( $address );
			if ( $dto ) {
				$addresses[] = $dto;
			}
		}
		return array_slice( $addresses, 0, 20 );
	}

	public function list_customer_addresses() {
		return rest_ensure_response( array( 'items' => $this->saved_customer_addresses( get_current_user_id() ) ) );
	}

	/** Persists checkout addresses on the account immediately, before an order is paid. */
	public function create_customer_address( WP_REST_Request $request ) {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) || ! isset( $input['title'], $input['address1'] ) || ! is_string( $input['title'] ) || ! is_string( $input['address1'] ) || ( isset( $input['address2'] ) && ! is_string( $input['address2'] ) ) ) {
			return $this->auth_error( 'kadochi_invalid_address', __( 'Address details are invalid.', 'kadochi-core' ), 400 );
		}
		$title = sanitize_text_field( $input['title'] );
		$address_1 = sanitize_text_field( $input['address1'] );
		$address_2 = isset( $input['address2'] ) ? sanitize_text_field( $input['address2'] ) : '';
		if ( '' === $title || '' === $address_1 || $this->string_length( $title ) > 100 || $this->string_length( $address_1 ) < 5 || $this->string_length( $address_1 ) > 200 || $this->string_length( $address_2 ) > 200 ) {
			return $this->auth_error( 'kadochi_invalid_address', __( 'Address details are invalid.', 'kadochi-core' ), 400 );
		}
		$location = null;
		if ( array_key_exists( 'location', $input ) && null !== $input['location'] ) {
			if ( ! is_array( $input['location'] ) || ! isset( $input['location']['latitude'], $input['location']['longitude'] ) || ! is_numeric( $input['location']['latitude'] ) || ! is_numeric( $input['location']['longitude'] ) ) {
				return $this->auth_error( 'kadochi_invalid_address', __( 'Address location is invalid.', 'kadochi-core' ), 400 );
			}
			$latitude = (float) $input['location']['latitude'];
			$longitude = (float) $input['location']['longitude'];
			if ( $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180 ) {
				return $this->auth_error( 'kadochi_invalid_address', __( 'Address location is invalid.', 'kadochi-core' ), 400 );
			}
			$location = array( 'latitude' => $latitude, 'longitude' => $longitude );
		}
		$user_id = get_current_user_id();
		$address = array( 'id' => wp_generate_uuid4(), 'title' => $title, 'address1' => $address_1, 'address2' => $address_2, 'location' => $location );
		$addresses = $this->saved_customer_addresses( $user_id );
		array_unshift( $addresses, $address );
		update_user_meta( $user_id, 'kadochi_saved_addresses', array_slice( $addresses, 0, 20 ) );
		return rest_ensure_response( $address );
	}

	/** Updates an address owned by the currently authenticated customer. */
	public function update_customer_address( WP_REST_Request $request ) {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) || ! isset( $input['title'], $input['address1'] ) || ! is_string( $input['title'] ) || ! is_string( $input['address1'] ) || ( isset( $input['address2'] ) && ! is_string( $input['address2'] ) ) ) {
			return $this->auth_error( 'kadochi_invalid_address', __( 'Address details are invalid.', 'kadochi-core' ), 400 );
		}
		$title = sanitize_text_field( $input['title'] );
		$address_1 = sanitize_text_field( $input['address1'] );
		$address_2 = isset( $input['address2'] ) ? sanitize_text_field( $input['address2'] ) : '';
		if ( '' === $title || '' === $address_1 || $this->string_length( $title ) > 100 || $this->string_length( $address_1 ) < 5 || $this->string_length( $address_1 ) > 200 || $this->string_length( $address_2 ) > 200 ) {
			return $this->auth_error( 'kadochi_invalid_address', __( 'Address details are invalid.', 'kadochi-core' ), 400 );
		}
		$location = null;
		if ( array_key_exists( 'location', $input ) && null !== $input['location'] ) {
			if ( ! is_array( $input['location'] ) || ! isset( $input['location']['latitude'], $input['location']['longitude'] ) || ! is_numeric( $input['location']['latitude'] ) || ! is_numeric( $input['location']['longitude'] ) ) {
				return $this->auth_error( 'kadochi_invalid_address', __( 'Address location is invalid.', 'kadochi-core' ), 400 );
			}
			$latitude = (float) $input['location']['latitude'];
			$longitude = (float) $input['location']['longitude'];
			if ( $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180 ) {
				return $this->auth_error( 'kadochi_invalid_address', __( 'Address location is invalid.', 'kadochi-core' ), 400 );
			}
			$location = array( 'latitude' => $latitude, 'longitude' => $longitude );
		}
		$id = $request->get_param( 'id' );
		$addresses = $this->saved_customer_addresses( get_current_user_id() );
		foreach ( $addresses as $index => $address ) {
			if ( $id !== $address['id'] ) {
				continue;
			}
			$updated = array( 'id' => $address['id'], 'title' => $title, 'address1' => $address_1, 'address2' => $address_2, 'location' => $location );
			$addresses[ $index ] = $updated;
			update_user_meta( get_current_user_id(), 'kadochi_saved_addresses', $addresses );
			return rest_ensure_response( $updated );
		}
		return $this->auth_error( 'kadochi_address_not_found', __( 'Address not found.', 'kadochi-core' ), 404 );
	}

	/** Deletes an address owned by the currently authenticated customer. */
	public function delete_customer_address( WP_REST_Request $request ) {
		$id = $request->get_param( 'id' );
		$addresses = $this->saved_customer_addresses( get_current_user_id() );
		$remaining = array_values( array_filter( $addresses, function( $address ) use ( $id ) {
			return $address['id'] !== $id;
		} ) );
		if ( count( $remaining ) === count( $addresses ) ) {
			return $this->auth_error( 'kadochi_address_not_found', __( 'Address not found.', 'kadochi-core' ), 404 );
		}
		update_user_meta( get_current_user_id(), 'kadochi_saved_addresses', $remaining );
		return new WP_REST_Response( null, 204 );
	}

	/** Shows app-managed customer fields in WordPress's native user edit screen. */
	public function render_customer_profile_fields( $user ) {
		if ( ! ( $user instanceof WP_User ) ) {
			return;
		}

		$attachment_id = absint( get_user_meta( $user->ID, 'kadochi_avatar_attachment_id', true ) );
		$birth_date = $this->customer_birth_date( $user->ID );
		$gender = $this->customer_gender( $user->ID );
		$avatar = $attachment_id ? wp_get_attachment_image( $attachment_id, array( 96, 96 ), false, array( 'class' => 'kadochi-customer-avatar', 'style' => 'border-radius:50%;height:96px;width:96px;object-fit:cover;', 'alt' => sprintf( __( '%s profile picture', 'kadochi-core' ), $user->display_name ) ) ) : '';
		$attachment_url = $attachment_id ? get_edit_post_link( $attachment_id ) : '';
		?>
		<h2><?php esc_html_e( 'Kadochi customer profile', 'kadochi-core' ); ?></h2>
		<?php wp_nonce_field( 'kadochi_customer_profile_update', 'kadochi_customer_profile_nonce' ); ?>
		<table class="form-table" role="presentation">
			<tr>
				<th><?php esc_html_e( 'Profile picture', 'kadochi-core' ); ?></th>
				<td>
					<?php if ( $avatar ) : ?>
						<?php echo $avatar; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WordPress creates this image markup. ?>
						<?php if ( $attachment_url ) : ?>
							<p><a href="<?php echo esc_url( $attachment_url ); ?>"><?php esc_html_e( 'View in Media Library', 'kadochi-core' ); ?></a></p>
						<?php endif; ?>
					<?php else : ?>
						<p class="description"><?php esc_html_e( 'No profile picture has been uploaded.', 'kadochi-core' ); ?></p>
					<?php endif; ?>
					<p class="description"><?php esc_html_e( 'Profile pictures are uploaded and managed from the Kadochi app.', 'kadochi-core' ); ?></p>
				</td>
			</tr>
			<tr>
				<th><label for="kadochi_birth_date"><?php esc_html_e( 'Birth date', 'kadochi-core' ); ?></label></th>
				<td><input class="regular-text" id="kadochi_birth_date" max="<?php echo esc_attr( gmdate( 'Y-m-d' ) ); ?>" name="kadochi_birth_date" type="date" value="<?php echo esc_attr( $birth_date ); ?>" /></td>
			</tr>
			<tr>
				<th><label for="kadochi_gender"><?php esc_html_e( 'Gender', 'kadochi-core' ); ?></label></th>
				<td>
					<select id="kadochi_gender" name="kadochi_gender">
						<option value=""><?php esc_html_e( 'Not provided', 'kadochi-core' ); ?></option>
						<option value="female" <?php selected( $gender, 'female' ); ?>><?php esc_html_e( 'Female', 'kadochi-core' ); ?></option>
						<option value="male" <?php selected( $gender, 'male' ); ?>><?php esc_html_e( 'Male', 'kadochi-core' ); ?></option>
						<option value="undisclosed" <?php selected( $gender, 'undisclosed' ); ?>><?php esc_html_e( 'Prefer not to say', 'kadochi-core' ); ?></option>
					</select>
				</td>
			</tr>
		</table>
		<?php
	}

	/** Allows authorised administrators to correct the non-image app profile fields. */
	public function save_customer_profile_fields( $user_id ) {
		if ( ! current_user_can( 'edit_user', $user_id ) || empty( $_POST['kadochi_customer_profile_nonce'] ) || ! wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['kadochi_customer_profile_nonce'] ) ), 'kadochi_customer_profile_update' ) ) {
			return;
		}

		$birth_date = isset( $_POST['kadochi_birth_date'] ) ? sanitize_text_field( wp_unslash( $_POST['kadochi_birth_date'] ) ) : '';
		if ( '' === $birth_date ) {
			delete_user_meta( $user_id, 'kadochi_birth_date' );
		} elseif ( $this->valid_customer_birth_date( $birth_date ) ) {
			update_user_meta( $user_id, 'kadochi_birth_date', $birth_date );
		}

		$gender = isset( $_POST['kadochi_gender'] ) ? sanitize_key( wp_unslash( $_POST['kadochi_gender'] ) ) : '';
		if ( '' === $gender ) {
			delete_user_meta( $user_id, 'kadochi_gender' );
		} elseif ( in_array( $gender, array( 'female', 'male', 'undisclosed' ), true ) ) {
			update_user_meta( $user_id, 'kadochi_gender', $gender );
		}
	}

	/** Adds app-managed profile values to the WordPress Users list. */
	public function add_customer_user_columns( $columns ) {
		$columns['kadochi_birth_date'] = __( 'Birth date', 'kadochi-core' );
		$columns['kadochi_gender'] = __( 'Gender', 'kadochi-core' );
		return $columns;
	}

	public function render_customer_user_column( $value, $column_name, $user_id ) {
		if ( 'kadochi_birth_date' === $column_name ) {
			$birth_date = $this->customer_birth_date( $user_id );
			return $birth_date ? esc_html( $birth_date ) : '&mdash;';
		}
		if ( 'kadochi_gender' === $column_name ) {
			$label = $this->customer_gender_label( $this->customer_gender( $user_id ) );
			return $label ? esc_html( $label ) : '&mdash;';
		}
		return $value;
	}

	/** Adds WooCommerce product-list metrics for reviews and app engagement. */
	public function add_product_engagement_columns( $columns ) {
		// Put the most useful metric next to the product name. Other engagement
		// columns remain at the end, where WooCommerce normally places extras.
		$columns_without_views = $columns;
		unset( $columns_without_views['kadochi_views'] );
		$columns = array();
		$views_added = false;
		foreach ( $columns_without_views as $column_name => $label ) {
			$columns[ $column_name ] = $label;
			if ( ! $views_added && in_array( $column_name, array( 'name', 'title' ), true ) ) {
				$columns['kadochi_views'] = __( 'Views', 'kadochi-core' );
				$views_added = true;
			}
		}
		if ( ! $views_added ) {
			$columns['kadochi_views'] = __( 'Views', 'kadochi-core' );
		}
		$columns['kadochi_review_count'] = __( 'Reviews', 'kadochi-core' );
		$columns['kadochi_average_rating'] = __( 'Rating', 'kadochi-core' );
		$columns['kadochi_saves'] = __( 'Saves', 'kadochi-core' );
		$columns['kadochi_likes'] = __( 'Likes', 'kadochi-core' );
		return $columns;
	}

	/** Keeps the Views metric discoverable even when a saved Screen Options preference predates it. */
	public function keep_product_views_column_visible( $hidden, $screen ) {
		if ( ! $screen || 'edit-product' !== $screen->id || ! is_array( $hidden ) ) {
			return $hidden;
		}
		return array_values( array_diff( $hidden, array( 'kadochi_views' ) ) );
	}

	/** Keep the added metrics readable instead of allowing WP's fixed table layout to crush them. */
	public function style_product_engagement_columns() {
		$screen = get_current_screen();
		if ( ! $screen || 'edit-product' !== $screen->id ) {
			return;
		}
		?>
		<style>
			.post-type-product .wp-list-table { min-width: 1780px; table-layout: auto; }
			.post-type-product .column-kadochi_review_count,
			.post-type-product .column-kadochi_average_rating,
			.post-type-product .column-kadochi_views,
			.post-type-product .column-kadochi_saves,
			.post-type-product .column-kadochi_likes { min-width: 64px; text-align: center; white-space: nowrap; }
			.post-type-product .column-kadochi_average_rating { min-width: 76px; }
		</style>
		<?php
	}

	public function render_product_engagement_column( $column_name, $post_id ) {
		if ( ! in_array( $column_name, array( 'kadochi_review_count', 'kadochi_average_rating', 'kadochi_views', 'kadochi_saves', 'kadochi_likes' ), true ) ) {
			return;
		}
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( $post_id ) : null;
		if ( 'kadochi_review_count' === $column_name ) {
			echo $product ? esc_html( (string) $product->get_review_count() ) : '&mdash;'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- entity is intentional.
			return;
		}
		if ( 'kadochi_average_rating' === $column_name ) {
			echo $product ? esc_html( number_format_i18n( (float) $product->get_average_rating(), 1 ) ) : '&mdash;'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- entity is intentional.
			return;
		}
		if ( 'kadochi_views' === $column_name ) {
			echo esc_html( number_format_i18n( $this->product_view_count( $post_id ) ) );
			return;
		}
		echo esc_html( (string) $this->product_action_count( $post_id, 'kadochi_saves' === $column_name ? 'save' : 'like' ) );
	}

	private function product_view_count( $product_id ) {
		return max( 0, absint( get_post_meta( absint( $product_id ), self::PRODUCT_VIEW_COUNT_META_KEY, true ) ) );
	}

	/** Records a storefront detail-page visit without counting server renders or metadata requests. */
	public function record_product_view( WP_REST_Request $request ) {
		$product = $this->action_product( $request->get_param( 'productId' ) );
		if ( is_wp_error( $product ) || 'publish' !== $product->get_status() ) {
			return $this->auth_error( 'kadochi_product_not_found', __( 'The product was not found.', 'kadochi-core' ), 404 );
		}

		$product_id = $product->get_id();
		if ( '' === get_post_meta( $product_id, self::PRODUCT_VIEW_COUNT_META_KEY, true ) ) {
			add_post_meta( $product_id, self::PRODUCT_VIEW_COUNT_META_KEY, 0, true );
		}
		global $wpdb;
		$wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->postmeta} SET meta_value = CAST(meta_value AS UNSIGNED) + 1 WHERE post_id = %d AND meta_key = %s", $product_id, self::PRODUCT_VIEW_COUNT_META_KEY ) );

		return rest_ensure_response( array( 'views' => $this->product_view_count( $product_id ) ) );
	}

	/** Adds a Views column to the native Posts list used for Magazine articles. */
	public function add_article_view_column( $columns ) {
		$updated_columns = array();
		$added = false;
		foreach ( $columns as $column_name => $label ) {
			$updated_columns[ $column_name ] = $label;
			if ( ! $added && 'title' === $column_name ) {
				$updated_columns['kadochi_article_views'] = __( 'Views', 'kadochi-core' );
				$added = true;
			}
		}
		if ( ! $added ) {
			$updated_columns['kadochi_article_views'] = __( 'Views', 'kadochi-core' );
		}
		return $updated_columns;
	}

	/** Enables WordPress's standard table-header sorting control for article views. */
	public function make_article_views_sortable( $columns ) {
		$columns['kadochi_article_views'] = 'kadochi_article_views';
		return $columns;
	}

	/** Keeps the Views column visible when an editor has old saved Screen Options. */
	public function keep_article_views_column_visible( $hidden, $screen ) {
		if ( ! $screen || 'edit-post' !== $screen->id || ! is_array( $hidden ) ) {
			return $hidden;
		}
		return array_values( array_diff( $hidden, array( 'kadochi_article_views' ) ) );
	}

	public function render_article_view_column( $column_name, $post_id ) {
		if ( 'kadochi_article_views' !== $column_name ) {
			return;
		}
		echo esc_html( number_format_i18n( $this->article_view_count( $post_id ) ) );
	}

	/** Sorts all articles, including those without a view-meta row, as zero-view articles. */
	public function sort_articles_by_views( $clauses, $query ) {
		$post_type = $query->get( 'post_type' );
		if ( ! is_admin() || ! $query->is_main_query() || 'kadochi_article_views' !== $query->get( 'orderby' ) || ( $post_type && 'post' !== $post_type ) ) {
			return $clauses;
		}

		global $wpdb;
		$meta_alias = 'kadochi_article_views_meta';
		$clauses['join'] .= $wpdb->prepare( " LEFT JOIN {$wpdb->postmeta} AS {$meta_alias} ON ({$wpdb->posts}.ID = {$meta_alias}.post_id AND {$meta_alias}.meta_key = %s)", self::ARTICLE_VIEW_COUNT_META_KEY );
		$direction = 'ASC' === strtoupper( (string) $query->get( 'order' ) ) ? 'ASC' : 'DESC';
		$clauses['orderby'] = "CAST(COALESCE({$meta_alias}.meta_value, 0) AS UNSIGNED) {$direction}, {$wpdb->posts}.post_date DESC";

		return $clauses;
	}

	/** Keeps the added magazine metric readable in WordPress's fixed post table. */
	public function style_article_view_column() {
		$screen = get_current_screen();
		if ( ! $screen || 'edit-post' !== $screen->id ) {
			return;
		}
		?>
		<style>
			.post-type-post .column-kadochi_article_views { width: 72px; text-align: center; white-space: nowrap; }
		</style>
		<?php
	}

	private function article_view_count( $post_id ) {
		return max( 0, absint( get_post_meta( absint( $post_id ), self::ARTICLE_VIEW_COUNT_META_KEY, true ) ) );
	}

	/** Records a public Magazine article visit after the browser has displayed the page. */
	public function record_article_view( WP_REST_Request $request ) {
		$post = get_post( absint( $request->get_param( 'postId' ) ) );
		if ( ! $post || 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
			return $this->auth_error( 'kadochi_article_not_found', __( 'The article was not found.', 'kadochi-core' ), 404 );
		}

		$post_id = (int) $post->ID;
		if ( '' === get_post_meta( $post_id, self::ARTICLE_VIEW_COUNT_META_KEY, true ) ) {
			add_post_meta( $post_id, self::ARTICLE_VIEW_COUNT_META_KEY, 0, true );
		}
		global $wpdb;
		$wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->postmeta} SET meta_value = CAST(meta_value AS UNSIGNED) + 1 WHERE post_id = %d AND meta_key = %s", $post_id, self::ARTICLE_VIEW_COUNT_META_KEY ) );

		return rest_ensure_response( array( 'views' => $this->article_view_count( $post_id ) ) );
	}

	private function product_actions_table() {
		global $wpdb;
		return $wpdb->prefix . 'kadochi_product_actions';
	}

	private function product_action_count( $product_id, $action_type ) {
		global $wpdb;
		return (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$this->product_actions_table()} WHERE product_id = %d AND action_type = %s", absint( $product_id ), $action_type ) );
	}

	private function action_product( $product_id ) {
		$product = function_exists( 'wc_get_product' ) ? wc_get_product( absint( $product_id ) ) : null;
		return $product ? $product : $this->auth_error( 'kadochi_product_not_found', __( 'The product was not found.', 'kadochi-core' ), 404 );
	}

	/** Lists the current customer's saved or liked product IDs, newest first. */
	public function list_profile_product_actions( WP_REST_Request $request ) {
		$action_type = sanitize_key( $request->get_param( 'action' ) );
		if ( ! in_array( $action_type, array( 'like', 'save' ), true ) ) {
			return $this->auth_error( 'kadochi_invalid_product_action', __( 'The product action is invalid.', 'kadochi-core' ), 400 );
		}
		$page = min( 100000, max( 1, absint( $request->get_param( 'page' ) ?: 1 ) ) );
		$per_page = min( 50, max( 1, absint( $request->get_param( 'perPage' ) ?: 20 ) ) );
		global $wpdb;
		$table = $this->product_actions_table();
		$user_id = get_current_user_id();
		$product_ids = $wpdb->get_col( $wpdb->prepare( "SELECT product_id FROM {$table} WHERE user_id = %d AND action_type = %s ORDER BY created_at DESC, id DESC LIMIT %d OFFSET %d", $user_id, $action_type, $per_page, ( $page - 1 ) * $per_page ) );
		$total = (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$table} WHERE user_id = %d AND action_type = %s", $user_id, $action_type ) );
		return rest_ensure_response( array(
			'productIds' => array_map( 'absint', $product_ids ),
			'page' => $page,
			'perPage' => $per_page,
			'total' => $total,
			'totalPages' => $total ? (int) ceil( $total / $per_page ) : 0,
		) );
	}

	private function valid_personal_profile_username( $username ) {
		return is_string( $username ) && preg_match( '/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/D', $username );
	}

	private function personal_profile_dto( $user_id ) {
		$username = get_user_meta( (int) $user_id, 'kadochi_personal_profile_username', true );
		return array(
			'username' => $this->valid_personal_profile_username( $username ) ? $username : null,
			'enabled' => '1' === get_user_meta( (int) $user_id, 'kadochi_personal_profile_enabled', true ),
			'showAvatar' => '0' !== get_user_meta( (int) $user_id, 'kadochi_personal_profile_show_avatar', true ),
			'showFirstName' => '0' !== get_user_meta( (int) $user_id, 'kadochi_personal_profile_show_first_name', true ),
			'showLastName' => '0' !== get_user_meta( (int) $user_id, 'kadochi_personal_profile_show_last_name', true ),
			'showBirthDate' => '1' === get_user_meta( (int) $user_id, 'kadochi_personal_profile_show_birth_date', true ),
			'showWishlist' => '0' !== get_user_meta( (int) $user_id, 'kadochi_personal_profile_show_wishlist', true ),
		);
	}

	public function personal_profile() {
		return rest_ensure_response( $this->personal_profile_dto( get_current_user_id() ) );
	}

	/** Saves a user's explicitly selected public-profile fields without exposing account data. */
	public function update_personal_profile( WP_REST_Request $request ) {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) || ! isset( $input['enabled'], $input['showAvatar'], $input['showFirstName'], $input['showLastName'], $input['showBirthDate'], $input['showWishlist'] ) || ! is_bool( $input['enabled'] ) || ! is_bool( $input['showAvatar'] ) || ! is_bool( $input['showFirstName'] ) || ! is_bool( $input['showLastName'] ) || ! is_bool( $input['showBirthDate'] ) || ! is_bool( $input['showWishlist'] ) ) {
			return $this->auth_error( 'kadochi_invalid_personal_profile', __( 'Profile settings are invalid.', 'kadochi-core' ), 400 );
		}

		$user_id = get_current_user_id();
		$current = $this->personal_profile_dto( $user_id );
		$username = array_key_exists( 'username', $input ) && is_string( $input['username'] ) ? strtolower( trim( $input['username'] ) ) : $current['username'];
		if ( $input['enabled'] && ! $this->valid_personal_profile_username( $username ) ) {
			return $this->auth_error( 'kadochi_invalid_personal_profile_username', __( 'Choose a valid profile username.', 'kadochi-core' ), 400 );
		}
		if ( null !== $username && ! $this->valid_personal_profile_username( $username ) ) {
			return $this->auth_error( 'kadochi_invalid_personal_profile_username', __( 'Choose a valid profile username.', 'kadochi-core' ), 400 );
		}
		if ( $username && $username !== $current['username'] ) {
			$matches = get_users( array( 'meta_key' => 'kadochi_personal_profile_username', 'meta_value' => $username, 'exclude' => array( $user_id ), 'number' => 1, 'fields' => 'ids' ) );
			if ( ! empty( $matches ) ) {
				return $this->auth_error( 'kadochi_personal_profile_username_taken', __( 'That profile username is already taken.', 'kadochi-core' ), 409 );
			}
			update_user_meta( $user_id, 'kadochi_personal_profile_username', $username );
		}

		$settings = array(
			'kadochi_personal_profile_enabled' => $input['enabled'],
			'kadochi_personal_profile_show_avatar' => $input['showAvatar'],
			'kadochi_personal_profile_show_first_name' => $input['showFirstName'],
			'kadochi_personal_profile_show_last_name' => $input['showLastName'],
			'kadochi_personal_profile_show_birth_date' => $input['showBirthDate'],
			'kadochi_personal_profile_show_wishlist' => $input['showWishlist'],
		);
		foreach ( $settings as $key => $value ) {
			update_user_meta( $user_id, $key, $value ? '1' : '0' );
		}
		return rest_ensure_response( $this->personal_profile_dto( $user_id ) );
	}

	public function public_personal_profile( WP_REST_Request $request ) {
		$username = strtolower( trim( (string) $request->get_param( 'username' ) ) );
		if ( ! $this->valid_personal_profile_username( $username ) ) {
			return $this->auth_error( 'kadochi_public_profile_not_found', __( 'The public profile was not found.', 'kadochi-core' ), 404 );
		}
		$users = get_users( array( 'meta_key' => 'kadochi_personal_profile_username', 'meta_value' => $username, 'number' => 1 ) );
		$user = ! empty( $users ) ? $users[0] : null;
		$settings = $user instanceof WP_User ? $this->personal_profile_dto( $user->ID ) : null;
		if ( ! $user || ! $settings || ! $settings['enabled'] || $settings['username'] !== $username ) {
			return $this->auth_error( 'kadochi_public_profile_not_found', __( 'The public profile was not found.', 'kadochi-core' ), 404 );
		}

		$first_name = $settings['showFirstName'] ? sanitize_text_field( get_user_meta( $user->ID, 'first_name', true ) ) : '';
		$last_name = $settings['showLastName'] ? sanitize_text_field( get_user_meta( $user->ID, 'last_name', true ) ) : '';
		$display_name = trim( $first_name . ' ' . $last_name );
		global $wpdb;
		$product_ids = array();
		if ( $settings['showWishlist'] ) {
			$product_ids = $wpdb->get_col( $wpdb->prepare( "SELECT product_id FROM {$this->product_actions_table()} WHERE user_id = %d AND action_type = %s ORDER BY created_at DESC, id DESC LIMIT 50", $user->ID, 'save' ) );
		}
		return rest_ensure_response( array(
			'username' => $username,
			'displayName' => '' !== $display_name ? $display_name : $username,
			'avatarSrc' => $settings['showAvatar'] ? $this->customer_avatar_url( $user->ID ) : null,
			'birthDate' => $settings['showBirthDate'] ? $this->customer_birth_date( $user->ID ) : null,
			'showWishlist' => $settings['showWishlist'],
			'productIds' => array_map( 'absint', $product_ids ),
		) );
	}

	public function product_actions( WP_REST_Request $request ) {
		$product = $this->action_product( $request->get_param( 'productId' ) );
		if ( is_wp_error( $product ) ) {
			return $product;
		}
		global $wpdb;
		$actions = $wpdb->get_col( $wpdb->prepare( "SELECT action_type FROM {$this->product_actions_table()} WHERE user_id = %d AND product_id = %d", get_current_user_id(), $product->get_id() ) );
		return rest_ensure_response( array( 'liked' => in_array( 'like', $actions, true ), 'saved' => in_array( 'save', $actions, true ) ) );
	}

	public function update_product_action( WP_REST_Request $request ) {
		$product = $this->action_product( $request->get_param( 'productId' ) );
		if ( is_wp_error( $product ) ) {
			return $product;
		}
		$action_type = sanitize_key( $request->get_param( 'action' ) );
		if ( null === $request->get_param( 'active' ) || ! in_array( $action_type, array( 'like', 'save' ), true ) ) {
			return $this->auth_error( 'kadochi_invalid_product_action', __( 'The product action is invalid.', 'kadochi-core' ), 400 );
		}
		$active = rest_sanitize_boolean( $request->get_param( 'active' ) );
		global $wpdb;
		$table = $this->product_actions_table();
		if ( $active ) {
			$wpdb->query( $wpdb->prepare( "INSERT IGNORE INTO {$table} (user_id, product_id, action_type, created_at) VALUES (%d, %d, %s, UTC_TIMESTAMP())", get_current_user_id(), $product->get_id(), $action_type ) );
		} else {
			$wpdb->delete( $table, array( 'user_id' => get_current_user_id(), 'product_id' => $product->get_id(), 'action_type' => $action_type ), array( '%d', '%d', '%s' ) );
		}
		return rest_ensure_response( array( 'liked' => 'like' === $action_type ? $active : $this->has_product_action( $product->get_id(), 'like' ), 'saved' => 'save' === $action_type ? $active : $this->has_product_action( $product->get_id(), 'save' ) ) );
	}

	private function has_product_action( $product_id, $action_type ) {
		global $wpdb;
		return (bool) $wpdb->get_var( $wpdb->prepare( "SELECT 1 FROM {$this->product_actions_table()} WHERE user_id = %d AND product_id = %d AND action_type = %s", get_current_user_id(), absint( $product_id ), $action_type ) );
	}

	private function base64url_encode( $value ) {
		return rtrim( strtr( base64_encode( $value ), '+/', '-_' ), '=' );
	}

	private function base64url_decode( $value ) {
		if ( ! is_string( $value ) || ! preg_match( '/^[A-Za-z0-9_-]+$/', $value ) ) {
			return false;
		}
		return base64_decode( strtr( $value, '-_', '+/' ) . str_repeat( '=', ( 4 - strlen( $value ) % 4 ) % 4 ), true );
	}

	private function jwt_key() {
		return hash_hmac( 'sha256', 'kadochi-jwt-v1', wp_salt( 'auth' ) );
	}

	private function jwt_issuer() {
		return untrailingslashit( home_url() );
	}

	private function jwt_audience() {
		return 'kadochi-front';
	}

	private function issue_jwt( $user_id, $phone ) {
		$now = time();
		$header = $this->base64url_encode( wp_json_encode( array( 'alg' => 'HS256', 'typ' => 'JWT' ) ) );
		$payload = $this->base64url_encode( wp_json_encode( array( 'iss' => $this->jwt_issuer(), 'aud' => $this->jwt_audience(), 'sub' => (int) $user_id, 'phone' => $phone, 'iat' => $now, 'exp' => $now + self::JWT_TTL_SECONDS ) ) );
		$unsigned = $header . '.' . $payload;
		return $unsigned . '.' . $this->base64url_encode( hash_hmac( 'sha256', $unsigned, $this->jwt_key(), true ) );
	}

	private function token_user_id( $token ) {
		$parts = explode( '.', $token );
		if ( 3 !== count( $parts ) || ! $parts[0] || ! $parts[1] || ! $parts[2] ) {
			return null;
		}
		$header_json = $this->base64url_decode( $parts[0] );
		$payload_json = $this->base64url_decode( $parts[1] );
		$signature = $this->base64url_decode( $parts[2] );
		if ( false === $header_json || false === $payload_json || false === $signature ) {
			return null;
		}
		$expected_signature = hash_hmac( 'sha256', $parts[0] . '.' . $parts[1], $this->jwt_key(), true );
		if ( ! hash_equals( $expected_signature, $signature ) ) {
			return null;
		}
		$header = json_decode( $header_json, true );
		$claims = json_decode( $payload_json, true );
		$now = time();
		if ( ! is_array( $header ) || ! is_array( $claims ) || 'HS256' !== ( isset( $header['alg'] ) ? $header['alg'] : null ) || 'JWT' !== ( isset( $header['typ'] ) ? $header['typ'] : null ) || $this->jwt_issuer() !== ( isset( $claims['iss'] ) ? $claims['iss'] : null ) || $this->jwt_audience() !== ( isset( $claims['aud'] ) ? $claims['aud'] : null ) || ! isset( $claims['sub'] ) || ! is_int( $claims['sub'] ) || $claims['sub'] <= 0 || ! isset( $claims['phone'] ) || $claims['phone'] !== $this->canonical_phone( $claims['phone'] ) || ! isset( $claims['iat'] ) || ! is_int( $claims['iat'] ) || $claims['iat'] > $now + 30 || ! isset( $claims['exp'] ) || ! is_int( $claims['exp'] ) || $claims['exp'] <= $now || $claims['exp'] <= $claims['iat'] ) {
			return null;
		}
		return get_user_by( 'id', $claims['sub'] ) ? $claims['sub'] : null;
	}

	private function bearer_token() {
		$header = isset( $_SERVER['HTTP_AUTHORIZATION'] ) ? $_SERVER['HTTP_AUTHORIZATION'] : ( isset( $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ) ? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] : '' );
		if ( ! is_string( $header ) || '' === trim( $header ) || ! preg_match( '/^\s*Bearer\b/i', $header ) ) {
			return null;
		}
		return preg_match( '/^\s*Bearer\s+(.+)\s*$/i', $header, $matches ) ? trim( $matches[1] ) : '';
	}

	public function determine_current_user( $user_id ) {
		if ( $user_id ) {
			return $user_id;
		}
		$token = $this->bearer_token();
		if ( null === $token ) {
			return $user_id;
		}
		$user_id = $this->token_user_id( $token );
		if ( $user_id ) {
			return $user_id;
		}
		$this->bearer_error = $this->auth_error( 'kadochi_invalid_token', __( 'The authentication token is invalid or expired.', 'kadochi-core' ), 401 );
		return null;
	}

	public function rest_authentication_errors( $result ) {
		return null === $result && $this->bearer_error ? $this->bearer_error : $result;
	}

	public function verify_otp( WP_REST_Request $request ) {
		$phone = $request->get_param( 'phone' );
		$code = $request->get_param( 'code' );
		$local_auth = $this->local_auth_enabled();
		if ( $local_auth ) {
			if ( '+989121234567' !== $phone || '1234' !== $code ) {
				return $this->invalid_otp();
			}
		} else {
			$internal_auth = $this->otp_internal_request_auth( $request, 'otp-verify', $phone . "\n" . $code );
			if ( is_wp_error( $internal_auth ) ) {
				return $internal_auth;
			}
			$phone_lock = $this->acquire_otp_lock( 'phone', $phone, 1 );
			if ( null === $phone_lock ) {
				return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
			}
			if ( ! $phone_lock ) {
				$this->otp_log( 'otp_verify_failed', array( 'failureCategory' => 'request_in_progress' ) );
				return $this->auth_error( 'kadochi_otp_cooldown', __( 'A verification request is already in progress.', 'kadochi-core' ), 429, array( 'retryAfter' => 2 ) );
			}
		}

		try {
			if ( ! $local_auth ) {
				$verified = $this->verify_stored_otp( $phone, $code );
				if ( is_wp_error( $verified ) ) {
					$this->otp_log( 'otp_verify_failed', array( 'failureCategory' => 'invalid_or_expired' ) );
					return $verified;
				}
			}
			$user_id = $this->resolve_customer( $phone );
			if ( is_wp_error( $user_id ) ) {
				$this->otp_log( 'otp_verify_failed', array( 'failureCategory' => 'customer_resolution' ) );
				return $user_id;
			}
			$customer = $this->customer_dto( $user_id );
			if ( ! $customer ) {
				$this->otp_log( 'otp_verify_failed', array( 'failureCategory' => 'customer_contract' ) );
				return $this->auth_error( 'kadochi_customer_unavailable', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
			}
			$response = rest_ensure_response( array( 'token' => $this->issue_jwt( $user_id, $phone ), 'expiresIn' => self::JWT_TTL_SECONDS, 'customer' => $customer ) );
			if ( ! $local_auth && ! $this->delete_transient_confirmed( $this->challenge_key( $phone ) ) ) {
				$this->otp_log( 'otp_verify_failed', array( 'failureCategory' => 'challenge_consume' ) );
				return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
			}
			$this->otp_log( 'otp_verify_completed' );
			return $response;
		} finally {
			if ( ! $local_auth ) {
				$this->release_otp_lock( 'phone', $phone );
			}
		}
	}

	public function health_response() {
		return rest_ensure_response( array( 'ok' => empty( $this->health ), 'checks' => $this->health ) );
	}

	public function customer() {
		$customer = $this->customer_dto( get_current_user_id() );
		return $customer ? rest_ensure_response( $customer ) : $this->auth_error( 'kadochi_customer_unavailable', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
	}

	/** Inserts an unread notification once for a user and a business event. */
	private function create_notification( $user_id, $event_key, $type, $message ) {
		global $wpdb;
		$user_id = absint( $user_id );
		if ( ! $user_id || '' === $event_key || '' === $message ) {
			return false;
		}
		return false !== $wpdb->query( $wpdb->prepare(
			"INSERT IGNORE INTO {$wpdb->prefix}kadochi_notifications (user_id, event_key, type, message, is_read, created_at) VALUES (%d, %s, %s, %s, 0, %s)",
			$user_id,
			sanitize_key( $event_key ),
			sanitize_key( $type ),
			sanitize_textarea_field( $message ),
			current_time( 'mysql', true )
		) );
	}

	private function unread_notification_count( $user_id ) {
		global $wpdb;
		return max( 0, (int) $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}kadochi_notifications WHERE user_id = %d AND is_read = 0", absint( $user_id ) ) ) );
	}

	/** Localizes legacy English records as they are read, while new records are written in Farsi. */
	private function notification_message( $type, $event_key, $message ) {
		$type = sanitize_key( $type );
		if ( 'welcome' === $type ) {
			return 'به کادوچی خوش آمدید.';
		}
		if ( 'order_placed' === $type && preg_match( '/^order-(\d+)-placed$/', $event_key, $matches ) ) {
			return sprintf( 'سفارش %d با موفقیت ثبت شد. برای مشاهده وضعیت سفارش، به بخش سفارش‌های من در حساب کاربری خود مراجعه کنید.', (int) $matches[1] );
		}
		if ( 'order_preparing' === $type && preg_match( '/^order-(\d+)-processing$/', $event_key, $matches ) ) {
			return sprintf( 'سفارش %d در حال آماده سازی است. سفارش شما در حال آماده سازی می‌باشد و در زمان انتخاب شده ارسال می‌گردد.', (int) $matches[1] );
		}
		if ( 'order_delivered' === $type && preg_match( '/^order-(\d+)-delivered$/', $event_key, $matches ) ) {
			return sprintf( 'سفارش %d تحویل داده شد. سفارش شما توسط پیک به دست گیرنده رسید و تحویل داده شد.', (int) $matches[1] );
		}
		if ( 'order_cancelled' === $type && preg_match( '/^order-(\d+)-cancelled$/', $event_key, $matches ) ) {
			return sprintf( 'سفارش %d لغو گردید. سفارش شما لغو گردید و مطابق قوانین لغو سفارش، پیگیری‌های بعدی انجام می‌شود.', (int) $matches[1] );
		}
		if ( 'order_pending_payment' === $type && preg_match( '/^order-(\d+)-pending-payment$/', $event_key, $matches ) ) {
			return sprintf( 'سفارش %d در انتظار پرداخت است. سفارش شما در انتظار پرداخت می‌باشد و ثبت نهایی نشده است.', (int) $matches[1] );
		}
		if ( 'occasion_reminder' === $type && preg_match( '/^Your personal occasion [“\"](.+)[”\"] is in three days\.$/u', $message, $matches ) ) {
			return sprintf( 'مناسبت شخصی «%s» سه روز دیگر است.', sanitize_text_field( $matches[1] ) );
		}
		return sanitize_textarea_field( $message );
	}

	public function list_notifications() {
		global $wpdb;
		$user_id = get_current_user_id();
		$rows = $wpdb->get_results( $wpdb->prepare( "SELECT id, event_key, type, message, is_read, created_at FROM {$wpdb->prefix}kadochi_notifications WHERE user_id = %d ORDER BY id DESC LIMIT 100", $user_id ) );
		$items = array();
		foreach ( is_array( $rows ) ? $rows : array() as $row ) {
			$timestamp = strtotime( $row->created_at . ' UTC' );
			$items[] = array(
				'id' => (int) $row->id,
				'type' => sanitize_key( $row->type ),
				'message' => $this->notification_message( $row->type, $row->event_key, $row->message ),
				'isRead' => (bool) $row->is_read,
				'createdAt' => $timestamp ? gmdate( 'Y-m-d\TH:i:s\Z', $timestamp ) : gmdate( 'Y-m-d\TH:i:s\Z' ),
			);
		}
		return rest_ensure_response( array( 'items' => $items, 'unreadCount' => $this->unread_notification_count( $user_id ) ) );
	}

	/** Opening the notification center acknowledges all currently unread notifications. */
	public function mark_notifications_read() {
		global $wpdb;
		$wpdb->update( $wpdb->prefix . 'kadochi_notifications', array( 'is_read' => 1 ), array( 'user_id' => get_current_user_id(), 'is_read' => 0 ), array( '%d' ), array( '%d', '%d' ) );
		return rest_ensure_response( array( 'unreadCount' => 0 ) );
	}

	public function notify_paid_order( $order_id ) {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return;
		}
		$order = wc_get_order( absint( $order_id ) );
		$user_id = $order && method_exists( $order, 'get_customer_id' ) ? (int) $order->get_customer_id() : 0;
		if ( $user_id ) {
			$this->create_notification( $user_id, 'order-' . absint( $order_id ) . '-placed', 'order_placed', sprintf( 'سفارش %d با موفقیت ثبت شد. برای مشاهده وضعیت سفارش، به بخش سفارش‌های من در حساب کاربری خود مراجعه کنید.', absint( $order_id ) ) );
		}
	}

	public function notify_order_status_change( $order_id, $old_status, $new_status, $order ) {
		$user_id = is_object( $order ) && method_exists( $order, 'get_customer_id' ) ? (int) $order->get_customer_id() : 0;
		if ( ! $user_id ) {
			return;
		}
		$new_status = sanitize_key( $new_status );
		if ( 'processing' === $new_status ) {
			$this->create_notification( $user_id, 'order-' . absint( $order_id ) . '-processing', 'order_preparing', sprintf( 'سفارش %d در حال آماده سازی است. سفارش شما در حال آماده سازی می‌باشد و در زمان انتخاب شده ارسال می‌گردد.', absint( $order_id ) ) );
		} elseif ( in_array( $new_status, array( 'completed', 'delivered' ), true ) ) {
			$this->create_notification( $user_id, 'order-' . absint( $order_id ) . '-delivered', 'order_delivered', sprintf( 'سفارش %d تحویل داده شد. سفارش شما توسط پیک به دست گیرنده رسید و تحویل داده شد.', absint( $order_id ) ) );
		} elseif ( in_array( $new_status, array( 'cancelled', 'canceled' ), true ) ) {
			$this->create_notification( $user_id, 'order-' . absint( $order_id ) . '-cancelled', 'order_cancelled', sprintf( 'سفارش %d لغو گردید. سفارش شما لغو گردید و مطابق قوانین لغو سفارش، پیگیری‌های بعدی انجام می‌شود.', absint( $order_id ) ) );
		} elseif ( in_array( $new_status, array( 'pending', 'pending-payment' ), true ) ) {
			$this->create_notification( $user_id, 'order-' . absint( $order_id ) . '-pending-payment', 'order_pending_payment', sprintf( 'سفارش %d در انتظار پرداخت است. سفارش شما در انتظار پرداخت می‌باشد و ثبت نهایی نشده است.', absint( $order_id ) ) );
		}
	}

	/** Updates the small, user-controlled part of a customer record. Phone and email stay owned by authentication. */
	public function update_customer_profile( WP_REST_Request $request ) {
		$input = $request->get_json_params();
		if ( ! is_array( $input ) || ( ! array_key_exists( 'firstName', $input ) && ! array_key_exists( 'lastName', $input ) && ! array_key_exists( 'avatarData', $input ) && ! array_key_exists( 'birthDate', $input ) && ! array_key_exists( 'gender', $input ) ) ) {
			return $this->auth_error( 'kadochi_invalid_profile', __( 'Provide at least one profile field.', 'kadochi-core' ), 400 );
		}

		$first_name = array_key_exists( 'firstName', $input ) && is_string( $input['firstName'] ) ? sanitize_text_field( $input['firstName'] ) : null;
		$last_name = array_key_exists( 'lastName', $input ) && is_string( $input['lastName'] ) ? sanitize_text_field( $input['lastName'] ) : null;
		$birth_date = array_key_exists( 'birthDate', $input ) && is_string( $input['birthDate'] ) ? trim( $input['birthDate'] ) : null;
		$gender = array_key_exists( 'gender', $input ) && is_string( $input['gender'] ) ? $input['gender'] : null;
		if ( ( null !== $first_name && $this->string_length( $first_name ) > 100 ) || ( null !== $last_name && $this->string_length( $last_name ) > 100 ) || ( array_key_exists( 'firstName', $input ) && null === $first_name ) || ( array_key_exists( 'lastName', $input ) && null === $last_name ) || ( array_key_exists( 'birthDate', $input ) && null !== $input['birthDate'] && ! $this->valid_customer_birth_date( $birth_date ) ) || ( array_key_exists( 'gender', $input ) && null !== $input['gender'] && ! in_array( $gender, array( 'female', 'male', 'undisclosed' ), true ) ) ) {
			return $this->auth_error( 'kadochi_invalid_profile', __( 'Profile fields are invalid.', 'kadochi-core' ), 400 );
		}

		$user_id = get_current_user_id();
		$user = get_user_by( 'id', $user_id );
		if ( ! $user ) {
			return $this->auth_error( 'kadochi_customer_unavailable', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
		}

		if ( array_key_exists( 'avatarData', $input ) ) {
			if ( null === $input['avatarData'] ) {
				$this->remove_customer_avatar( $user_id );
			} else {
				$saved_avatar = $this->save_customer_avatar( $user_id, $input['avatarData'] );
				if ( is_wp_error( $saved_avatar ) ) {
					return $this->auth_error( 'kadochi_invalid_profile', __( 'Avatar image is invalid.', 'kadochi-core' ), 400 );
				}
			}
		}
		if ( null !== $first_name ) {
			update_user_meta( $user_id, 'first_name', $first_name );
			update_user_meta( $user_id, 'billing_first_name', $first_name );
		}
		if ( null !== $last_name ) {
			update_user_meta( $user_id, 'last_name', $last_name );
			update_user_meta( $user_id, 'billing_last_name', $last_name );
		}
		if ( array_key_exists( 'birthDate', $input ) ) {
			if ( null === $input['birthDate'] ) {
				delete_user_meta( $user_id, 'kadochi_birth_date' );
			} else {
				update_user_meta( $user_id, 'kadochi_birth_date', $birth_date );
			}
		}
		if ( array_key_exists( 'gender', $input ) ) {
			if ( null === $input['gender'] ) {
				delete_user_meta( $user_id, 'kadochi_gender' );
			} else {
				update_user_meta( $user_id, 'kadochi_gender', $gender );
			}
		}

		$next_first_name = null === $first_name ? sanitize_text_field( get_user_meta( $user_id, 'first_name', true ) ) : $first_name;
		$next_last_name = null === $last_name ? sanitize_text_field( get_user_meta( $user_id, 'last_name', true ) ) : $last_name;
		$display_name = trim( $next_first_name . ' ' . $next_last_name );
		if ( '' !== $display_name ) {
			$updated = wp_update_user( array( 'ID' => $user_id, 'display_name' => $display_name ) );
			if ( is_wp_error( $updated ) ) {
				return $this->auth_error( 'kadochi_customer_unavailable', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
			}
		}

		$customer = $this->customer_dto( $user_id );
		return $customer ? rest_ensure_response( $customer ) : $this->auth_error( 'kadochi_customer_unavailable', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
	}

	private function payment_method_id() {
		$value = getenv( 'KADOCHI_PAYMENT_METHOD_ID' );
		$value = is_string( $value ) ? trim( $value ) : '';
		return preg_match( '/^[A-Za-z0-9_-]{1,100}$/', $value ) ? $value : 'WC_ZPal';
	}

	/** Registers Store API-persisted values; the headless BFF writes these before payment. */
	public function register_checkout_fields() {
		if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
			$this->health['checkout_fields'] = __( 'WooCommerce Additional Checkout Fields is required for Kadochi checkout.', 'kadochi-core' );
			return;
		}
		$fields = array(
			array( 'id' => self::CHECKOUT_FIELD_DELIVERY_SLOT, 'label' => __( 'Delivery slot', 'kadochi-core' ), 'location' => 'order', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
			array( 'id' => self::CHECKOUT_FIELD_PACKAGING, 'label' => __( 'Packaging', 'kadochi-core' ), 'location' => 'order', 'required' => true, 'type' => 'select', 'options' => array( array( 'value' => 'gift', 'label' => __( 'Gift packaging', 'kadochi-core' ) ), array( 'value' => 'normal', 'label' => __( 'Normal packaging', 'kadochi-core' ) ) ) ),
			array( 'id' => self::CHECKOUT_FIELD_POSTCARD, 'label' => __( 'Postcard message', 'kadochi-core' ), 'optionalLabel' => __( 'Postcard message', 'kadochi-core' ), 'location' => 'order', 'required' => false, 'sanitize_callback' => 'sanitize_textarea_field' ),
			array( 'id' => self::CHECKOUT_FIELD_POSTCARD_DESIGN, 'label' => __( 'Postcard design', 'kadochi-core' ), 'optionalLabel' => __( 'Postcard design', 'kadochi-core' ), 'location' => 'order', 'required' => false, 'sanitize_callback' => 'sanitize_text_field' ),
			array( 'id' => self::CHECKOUT_FIELD_LOCATION, 'label' => __( 'Delivery location', 'kadochi-core' ), 'optionalLabel' => __( 'Delivery location', 'kadochi-core' ), 'location' => 'order', 'required' => false, 'sanitize_callback' => 'sanitize_text_field' ),
			array( 'id' => self::CHECKOUT_FIELD_OPERATION, 'label' => __( 'Kadochi checkout operation', 'kadochi-core' ), 'location' => 'order', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
		);
		foreach ( $fields as $field ) {
			woocommerce_register_additional_checkout_field( $field );
		}
	}

	/** Adds the product-level preparation-time control to WooCommerce's General tab. */
	public function render_product_preparation_hours_field() {
		global $post;
		$product_id = $post instanceof WP_Post ? $post->ID : 0;
		$value = $product_id ? get_post_meta( $product_id, self::PRODUCT_PREPARATION_HOURS_META_KEY, true ) : '';
		woocommerce_wp_text_input( array(
			'id' => self::PRODUCT_PREPARATION_HOURS_META_KEY,
			'label' => __( 'Preparation time (hours)', 'kadochi-core' ),
			'description' => __( 'How many hours are required before this product can be delivered. Products below 6 hours are marked for Express Delivery.', 'kadochi-core' ),
			'desc_tip' => true,
			'type' => 'number',
			'value' => '' === $value ? self::DEFAULT_PRODUCT_PREPARATION_HOURS : $value,
			'custom_attributes' => array( 'min' => 1, 'max' => self::MAX_PRODUCT_PREPARATION_HOURS, 'step' => 1 ),
		) );
	}

	/** Saves a bounded integer lead time and keeps the canonical PLP tag in sync. */
	public function save_product_preparation_hours_field( $product_id ) {
		$product_id = absint( $product_id );
		if ( ! $product_id || ! current_user_can( 'edit_post', $product_id ) ) {
			return;
		}
		$raw = isset( $_POST[ self::PRODUCT_PREPARATION_HOURS_META_KEY ] ) ? trim( wp_unslash( $_POST[ self::PRODUCT_PREPARATION_HOURS_META_KEY ] ) ) : '';
		if ( ! is_string( $raw ) || ! preg_match( '/^[1-9][0-9]{0,2}$/', $raw ) || (int) $raw > self::MAX_PRODUCT_PREPARATION_HOURS ) {
			delete_post_meta( $product_id, self::PRODUCT_PREPARATION_HOURS_META_KEY );
			$this->sync_product_fast_delivery_tag( $product_id, self::DEFAULT_PRODUCT_PREPARATION_HOURS );
			return;
		}
		$hours = (int) $raw;
		update_post_meta( $product_id, self::PRODUCT_PREPARATION_HOURS_META_KEY, $hours );
		$this->sync_product_fast_delivery_tag( $product_id, $hours );
	}

	/** Maintains the existing fast-delivery PLP filter from the preparation-time rule. */
	private function sync_product_fast_delivery_tag( $product_id, $hours ) {
		$tag = get_term_by( 'slug', 'fast-delivery', 'product_tag' );
		if ( (int) $hours < 6 ) {
			wp_set_object_terms( $product_id, array( 'fast-delivery' ), 'product_tag', true );
			return;
		}
		if ( $tag && ! is_wp_error( $tag ) ) {
			wp_remove_object_terms( $product_id, array( (int) $tag->term_id ), 'product_tag' );
		}
	}

	/** Exposes server-derived lead-time and express eligibility to Store API clients. */
	public function register_store_api_data() {
		if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) ) {
			return;
		}
		if ( class_exists( '\\Automattic\\WooCommerce\\StoreApi\\Schemas\\V1\\CartItemSchema' ) ) {
			woocommerce_store_api_register_endpoint_data( array(
				'endpoint' => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema::IDENTIFIER,
				'namespace' => 'kadochi',
				'data_callback' => array( $this, 'cart_item_extension_data' ),
				'schema_callback' => array( $this, 'cart_item_extension_schema' ),
				'schema_type' => ARRAY_A,
			) );
		}
		if ( class_exists( '\\Automattic\\WooCommerce\\StoreApi\\Schemas\\V1\\ProductSchema' ) ) {
			woocommerce_store_api_register_endpoint_data( array(
				'endpoint' => \Automattic\WooCommerce\StoreApi\Schemas\V1\ProductSchema::IDENTIFIER,
				'namespace' => 'kadochi',
				'data_callback' => array( $this, 'product_extension_data' ),
				'schema_callback' => array( $this, 'product_extension_schema' ),
				'schema_type' => ARRAY_A,
			) );
		}
	}

	/** Marks a Store API cart line added from the cart's cross-sell rail. */
	public function mark_cross_sell_cart_item( $add_to_cart_data, $request ) {
		if ( true === $request->get_param( 'kadochi_cross_sell' ) ) {
			$add_to_cart_data['cart_item_data']['kadochi_cross_sell'] = true;
		}
		return $add_to_cart_data;
	}

	public function cart_item_extension_data( $cart_item ) {
		$product = is_array( $cart_item ) && isset( $cart_item['data'] ) ? $cart_item['data'] : null;
		$data = $this->product_delivery_data( $product );
		$data['isCrossSell'] = is_array( $cart_item ) && ! empty( $cart_item['kadochi_cross_sell'] );
		return $data;
	}

	public function cart_item_extension_schema() {
		$schema = $this->product_extension_schema();
		$schema['isCrossSell'] = array(
			'description' => __( 'Whether this cart line was added from Kadochi cross-sell suggestions.', 'kadochi-core' ),
			'type' => 'boolean',
			'readonly' => true,
		);
		return $schema;
	}

	public function product_extension_data( $product ) {
		return $this->product_delivery_data( $product );
	}

	public function product_extension_schema() {
		return array(
			'preparationHours' => array(
				'description' => __( 'Hours required to prepare the product before delivery.', 'kadochi-core' ),
				'type' => 'integer',
				'readonly' => true,
			),
			'fastDelivery' => array(
				'description' => __( 'Whether the product is eligible for Kadochi Express Delivery.', 'kadochi-core' ),
				'type' => 'boolean',
				'readonly' => true,
			),
		);
	}

	private function product_delivery_data( $product ) {
		$hours = $this->product_preparation_hours( $product );
		return array( 'preparationHours' => $hours, 'fastDelivery' => $hours < 6 );
	}

	/** Uses the parent product's setting for variations and safely defaults legacy products. */
	private function product_preparation_hours( $product ) {
		if ( ! is_object( $product ) || ! method_exists( $product, 'get_id' ) ) {
			return self::DEFAULT_PRODUCT_PREPARATION_HOURS;
		}
		$product_id = method_exists( $product, 'get_parent_id' ) && $product->get_parent_id() ? $product->get_parent_id() : $product->get_id();
		$raw = get_post_meta( $product_id, self::PRODUCT_PREPARATION_HOURS_META_KEY, true );
		return is_scalar( $raw ) && preg_match( '/^[1-9][0-9]{0,2}$/', (string) $raw ) && (int) $raw <= self::MAX_PRODUCT_PREPARATION_HOURS
			? (int) $raw
			: self::DEFAULT_PRODUCT_PREPARATION_HOURS;
	}

	private function cart_preparation_hours() {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return self::DEFAULT_PRODUCT_PREPARATION_HOURS;
		}
		$items = WC()->cart->get_cart();
		if ( empty( $items ) ) {
			return self::DEFAULT_PRODUCT_PREPARATION_HOURS;
		}
		$hours = 1;
		foreach ( $items as $item ) {
			$product = is_array( $item ) && isset( $item['data'] ) ? $item['data'] : null;
			$hours = max( $hours, $this->product_preparation_hours( $product ) );
		}
		return $hours;
	}

	private function tehran_destination( $country, $city ) {
		$country = strtoupper( sanitize_text_field( $country ) );
		$city = str_replace( array( 'ي', 'ى', 'ك' ), array( 'ی', 'ی', 'ک' ), trim( sanitize_text_field( $city ) ) );
		return 'IR' === $country && in_array( $city, array( 'تهران', 'Tehran', 'TEHRAN' ), true );
	}

	/** WooCommerce owns shipping prices; Kadochi only limits their availability to Tehran. */
	public function limit_shipping_to_tehran( $rates, $package ) {
		$destination = is_array( $package ) && isset( $package['destination'] ) && is_array( $package['destination'] ) ? $package['destination'] : array();
		$country = isset( $destination['country'] ) ? $destination['country'] : '';
		$city = isset( $destination['city'] ) ? $destination['city'] : '';
		if ( ! $this->tehran_destination( $country, $city ) ) {
			return array();
		}
		return $rates;
	}

	/** The WooCommerce standard tax rate is available only to Tehran delivery addresses. */
	public function limit_tax_to_tehran( $address, $customer ) {
		if ( ! is_array( $address ) || ! $this->tehran_destination( isset( $address[0] ) ? $address[0] : '', isset( $address[3] ) ? $address[3] : '' ) ) {
			return array( '', '', '', '' );
		}
		return $address;
	}

	/**
	 * Recomputes the three visible calendar days in Tehran time. Every day and
	 * time window stays in the response so checkout can disable unavailable
	 * choices, while only an available window is accepted when an order is placed.
	 */
	private function delivery_slots() {
		$timezone = new DateTimeZone( 'Asia/Tehran' );
		$now = new DateTimeImmutable( 'now', $timezone );
		$today = $now->setTime( 0, 0, 0 );
		$ready_at = $now->modify( '+' . $this->cart_preparation_hours() . ' hours' );
		$windows = array( array( 10, 13 ), array( 13, 16 ), array( 16, 19 ) );
		$slots = array();
		for ( $offset = 0; $offset < 3; $offset++ ) {
			$day = $today->modify( '+' . $offset . ' days' );
			$is_today = 0 === $offset;
			$is_friday = '5' === $day->format( 'N' );
			foreach ( $windows as $window ) {
				$date = $day->format( 'Y-m-d' );
				$slot_start = $day->setTime( $window[0], 0, 0 );
				$available = ! $is_friday && ( ! $is_today || $window[0] > (int) $now->format( 'G' ) ) && $slot_start >= $ready_at;
				$slots[] = array( 'id' => $date . '-' . $window[0], 'date' => $date, 'startHour' => $window[0], 'endHour' => $window[1], 'label' => $date . '، ' . $window[0] . ' تا ' . $window[1], 'available' => $available );
			}
		}
		return $slots;
	}

	private function valid_delivery_slot( $value ) {
		if ( ! is_string( $value ) || ! preg_match( '/^\\d{4}-\\d{2}-\\d{2}-(10|13|16)$/', $value ) ) {
			return false;
		}
		foreach ( $this->delivery_slots() as $slot ) {
			if ( $slot['available'] && hash_equals( $slot['id'], $value ) ) {
				return true;
			}
		}
		return false;
	}

	public function validate_checkout_field( WP_Error $errors, $field_key, $field_value ) {
		if ( self::CHECKOUT_FIELD_DELIVERY_SLOT === $field_key && ! $this->valid_delivery_slot( $field_value ) ) {
			$errors->add( 'kadochi_invalid_delivery_slot', __( 'The selected delivery slot is no longer available.', 'kadochi-core' ) );
		}
		if ( self::CHECKOUT_FIELD_PACKAGING === $field_key && ! in_array( $field_value, array( 'gift', 'normal' ), true ) ) {
			$errors->add( 'kadochi_invalid_packaging', __( 'Choose a valid packaging option.', 'kadochi-core' ) );
		}
		if ( self::CHECKOUT_FIELD_POSTCARD === $field_key && ( ! is_string( $field_value ) || $this->string_length( $field_value ) > 200 ) ) {
			$errors->add( 'kadochi_invalid_postcard', __( 'The postcard message is too long.', 'kadochi-core' ) );
		}
		if ( self::CHECKOUT_FIELD_POSTCARD_DESIGN === $field_key && '' !== (string) $field_value && ! $this->postcard_design( $field_value ) ) {
			$errors->add( 'kadochi_invalid_postcard_design', __( 'Choose a valid postcard design.', 'kadochi-core' ) );
		}
		if ( self::CHECKOUT_FIELD_LOCATION === $field_key && '' !== $field_value && ( ! is_string( $field_value ) || ! preg_match( '/^-?\d{1,2}(?:\.\d{1,6})?,-?\d{1,3}(?:\.\d{1,6})?$/', $field_value ) ) ) {
			$errors->add( 'kadochi_invalid_location', __( 'The delivery location is invalid.', 'kadochi-core' ) );
		}
		if ( self::CHECKOUT_FIELD_OPERATION === $field_key && ( ! is_string( $field_value ) || ! preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i', $field_value ) ) ) {
			$errors->add( 'kadochi_invalid_operation', __( 'The checkout operation is invalid.', 'kadochi-core' ) );
		}
	}

	/**
	 * WooCommerce Store API 10.8+ converts every already-queued WC error notice
	 * into a checkout conflict during cart validation. A product that was removed
	 * from a cart earlier can therefore leave a stale notice that prevents a later,
	 * otherwise valid order from being placed. Clear notices only before the Store
	 * API runs its fresh cart checks; errors generated by the current check remain.
	 */
	public function clear_stale_store_api_cart_notices() {
		if ( ! defined( 'REST_REQUEST' ) || ! REST_REQUEST || ! function_exists( 'wc_clear_notices' ) ) {
			return;
		}
		$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? (string) $_SERVER['REQUEST_URI'] : '';
		if ( false === strpos( $request_uri, '/wp-json/wc/store/' ) ) {
			return;
		}
		wc_clear_notices();
	}

	private function checkout_operation_meta_key() {
		return '_wc_other/' . self::CHECKOUT_FIELD_OPERATION;
	}

	/** Validates the materialized Store API order before Woo's own final order checks. */
	public function validate_store_checkout_order( $order, WP_REST_Request $request ) {
		// PUT stores the draft fields; only POST materializes an order for payment.
		if ( 'POST' !== $request->get_method() ) {
			return;
		}
		// Payment gateway IDs are case-sensitive. `sanitize_key()` lowercases the
		// official Zarinpal ID (`WC_ZPal`) and consequently rejects it before Woo
		// can create the redirect URL.
		$method = sanitize_text_field( (string) $request->get_param( 'payment_method' ) );
		if ( $this->payment_method_id() !== $method ) {
			throw new Exception( __( 'The selected payment method is unavailable.', 'kadochi-core' ) );
		}
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_meta' ) ) {
			return;
		}
		$delivery_slot = (string) $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_DELIVERY_SLOT, true );
		if ( ! $this->valid_delivery_slot( $delivery_slot ) ) {
			throw new Exception( __( 'The selected delivery slot is no longer available.', 'kadochi-core' ) );
		}
		$packaging = (string) $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_PACKAGING, true );
		if ( ! in_array( $packaging, array( 'gift', 'normal' ), true ) ) {
			throw new Exception( __( 'Choose a valid packaging option.', 'kadochi-core' ) );
		}
		$postcard_design = (string) $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_POSTCARD_DESIGN, true );
		if ( '' !== $postcard_design ) {
			$design = $this->postcard_design( $postcard_design );
			if ( ! $design ) {
				throw new Exception( __( 'Choose a valid postcard design.', 'kadochi-core' ) );
			}
			// Snapshot the title: a later editorial rename must not alter an order's fulfillment instructions.
			$order->update_meta_data( '_kadochi_postcard_design_title', $design['title'] );
		} else {
			$order->delete_meta_data( '_kadochi_postcard_design_title' );
		}
		$operation = (string) $order->get_meta( $this->checkout_operation_meta_key(), true );
		if ( ! preg_match( '/^[a-f0-9-]{36}$/i', $operation ) ) {
			throw new Exception( __( 'The checkout operation was not recorded.', 'kadochi-core' ) );
		}
		$order->update_meta_data( '_kadochi_checkout_operation', $operation );
	}

	/** Acquires the idempotency lock after validation and immediately before payment. */
	public function lock_store_checkout_order( $order ) {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_meta' ) ) {
			throw new Exception( __( 'The checkout order is unavailable.', 'kadochi-core' ) );
		}
		// `woocommerce_store_api_checkout_update_order_from_request` can update an
		// order object that WooCommerce subsequently reloads before this hook. The
		// derived `_kadochi_checkout_operation` value is therefore not guaranteed to
		// have been saved yet. The Store API additional-field meta is the durable
		// value for this checkout and is already persisted with the order.
		$operation = (string) $order->get_meta( $this->checkout_operation_meta_key(), true );
		if ( ! preg_match( '/^[a-f0-9-]{36}$/i', $operation ) ) {
			throw new Exception( __( 'The checkout operation was not recorded.', 'kadochi-core' ) );
		}
		$lock_key = 'kadochi_checkout_operation_' . hash( 'sha256', $operation );
		if ( ! add_option( $lock_key, array( 'order' => method_exists( $order, 'get_id' ) ? $order->get_id() : 0, 'createdAt' => time() ), '', 'no' ) ) {
			throw new Exception( __( 'This checkout is already being processed.', 'kadochi-core' ) );
		}
	}

	public function checkout_return_url( $url, $order ) {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_payment_method' ) || $this->payment_method_id() !== $order->get_payment_method() ) {
			return $url;
		}
		$frontend_return_url = $this->frontend_checkout_result_url( 'return', $order );
		return $frontend_return_url ?: $url;
	}

	/** Allows WooCommerce's safe post-verification redirect to the configured frontend only. */
	public function allow_frontend_checkout_redirect_host( $hosts, $host ) {
		$frontend = $this->trusted_frontend_url();
		$frontend_host = $frontend ? wp_parse_url( $frontend, PHP_URL_HOST ) : '';
		if ( ! is_string( $frontend_host ) || '' === $frontend_host ) {
			return $hosts;
		}
		$hosts = is_array( $hosts ) ? $hosts : array();
		$hosts[] = strtolower( $frontend_host );
		return array_values( array_unique( $hosts ) );
	}

	/** Redirects an abandoned ZarinPal payment to the frontend's failure screen. */
	public function redirect_cancelled_gateway_payment() {
		// The gateway uses any value other than OK when the customer cancels.
		$status = isset( $_GET['Status'] ) ? sanitize_text_field( wp_unslash( $_GET['Status'] ) ) : '';
		if ( 'OK' === $status ) {
			return;
		}
		$order_id = isset( $_GET['wc_order'] ) ? absint( wp_unslash( $_GET['wc_order'] ) ) : 0;
		$order = $order_id && function_exists( 'wc_get_order' ) ? wc_get_order( $order_id ) : false;
		if ( ! $order || $order->is_paid() || $this->payment_method_id() !== $order->get_payment_method() ) {
			return;
		}
		$this->release_payment_attempt( $order, null, 'cancelled' );
		$this->payment_log( 'payment_cancelled', array( 'order_id' => absint( $order->get_id() ), 'gateway' => 'zarinpal' ) );
		$failure_url = $this->frontend_checkout_result_url( 'failure', $order );
		if ( ! $failure_url ) {
			return;
		}
		wp_safe_redirect( $failure_url );
		exit;
	}

	/** Writes support-safe, structured ZarinPal lifecycle logs through WooCommerce. */
	private function payment_log( $event, $context = array() ) {
		$payload = array_merge(
			array(
				'event' => sanitize_key( $event ),
				'gateway' => 'zarinpal',
				'requestId' => $this->payment_request_id(),
			),
			is_array( $context ) ? $context : array()
		);
		$message = wp_json_encode( $payload );
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->info( $message, array( 'source' => 'kadochi-zarinpal' ) );
			return;
		}
		error_log( '[kadochi-zarinpal] ' . $message ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
	}

	/** Returns an opaque correlation ID and never includes customer or payment data. */
	private function payment_request_id() {
		$value = isset( $_SERVER['HTTP_X_REQUEST_ID'] ) ? (string) $_SERVER['HTTP_X_REQUEST_ID'] : '';
		$value = preg_replace( '/[^A-Za-z0-9._:-]/', '', sanitize_text_field( $value ) );
		return substr( $value, 0, 128 ) ?: 'unknown';
	}

	private function valid_payment_attempt_id( $value ) {
		return is_string( $value ) && (bool) preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i', $value );
	}

	/** A single, non-autoloaded option is an atomic per-order payment-attempt lock. */
	private function payment_attempt_lock_key( $order ) {
		return 'kadochi_payment_attempt_' . absint( is_object( $order ) && method_exists( $order, 'get_id' ) ? $order->get_id() : 0 );
	}

	private function payment_attempt_failure_meta_key() {
		return '_kadochi_payment_attempt_failure';
	}

	/** Allows only the two ZarinPal handoff hosts; the authority is never logged separately. */
	private function trusted_zarinpal_redirect( $redirect ) {
		$redirect = is_string( $redirect ) ? esc_url_raw( $redirect, array( 'http', 'https' ) ) : '';
		$parts = $redirect ? wp_parse_url( $redirect ) : false;
		if ( ! is_array( $parts ) || empty( $parts['host'] ) || empty( $parts['scheme'] ) || ! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) ) {
			return false;
		}
		return in_array( strtolower( $parts['host'] ), array( 'payment.zarinpal.com', 'sandbox.zarinpal.com' ), true ) ? $redirect : false;
	}

	/**
	 * Acquires a per-order payment lock, or recovers the redirect made by an
	 * already-completed identical attempt. `add_option()` provides the atomic
	 * compare-and-set operation across concurrent PHP workers.
	 */
	private function begin_payment_attempt( $order, $attempt_id ) {
		$lock_key = $this->payment_attempt_lock_key( $order );
		$now = time();
		$existing = get_option( $lock_key, false );
		if ( is_array( $existing ) ) {
			$existing_id = isset( $existing['attemptId'] ) && is_string( $existing['attemptId'] ) ? $existing['attemptId'] : '';
			$started_at = isset( $existing['startedAt'] ) ? absint( $existing['startedAt'] ) : 0;
			$redirect = isset( $existing['redirectUrl'] ) ? $this->trusted_zarinpal_redirect( $existing['redirectUrl'] ) : false;
			if ( $redirect ) {
				$this->payment_log( 'payment_authority_recovered', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id, 'same_attempt' => hash_equals( $existing_id, $attempt_id ) ) );
				return array( 'redirectUrl' => $redirect );
			}
			if ( $started_at && $started_at > $now - self::PAYMENT_ATTEMPT_LOCK_SECONDS ) {
				$retry_after = max( 1, self::PAYMENT_ATTEMPT_LOCK_SECONDS - ( $now - $started_at ) );
				$this->payment_log( 'payment_in_progress_detected', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id, 'retry_after' => $retry_after ) );
				return $this->auth_error( 'kadochi_payment_in_progress', __( 'A payment attempt is already in progress.', 'kadochi-core' ), 409, array( 'retryAfter' => $retry_after ) );
			}
			// A worker that never reached ZarinPal cannot reserve an order forever.
			delete_option( $lock_key );
			$this->payment_log( 'payment_attempt_lock_expired', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id ) );
		}

		$failure = get_post_meta( $order->get_id(), $this->payment_attempt_failure_meta_key(), true );
		if ( is_array( $failure ) && isset( $failure['attemptId'] ) && is_string( $failure['attemptId'] ) && hash_equals( $failure['attemptId'], $attempt_id ) ) {
			$this->payment_log( 'payment_start_rejected', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id, 'reason' => 'previous_failure' ) );
			return $this->auth_error( 'kadochi_payment_unavailable', __( 'The payment gateway could not start a payment.', 'kadochi-core' ), 502 );
		}

		$lock = array( 'attemptId' => $attempt_id, 'startedAt' => $now );
		if ( ! add_option( $lock_key, $lock, '', 'no' ) ) {
			// Another request won the race after the read above. It must not start a
			// second authority; the caller can safely retry its recovery lookup.
			$this->payment_log( 'payment_in_progress_detected', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id, 'retry_after' => 1 ) );
			return $this->auth_error( 'kadochi_payment_in_progress', __( 'A payment attempt is already in progress.', 'kadochi-core' ), 409, array( 'retryAfter' => 1 ) );
		}
		delete_post_meta( $order->get_id(), $this->payment_attempt_failure_meta_key() );
		return true;
	}

	/** Releases a failed or cancelled attempt while retaining only a bounded safe tombstone. */
	private function release_payment_attempt( $order, $attempt_id = null, $reason = 'gateway_failure' ) {
		$lock_key = $this->payment_attempt_lock_key( $order );
		$existing = get_option( $lock_key, false );
		if ( ! is_array( $existing ) || ! isset( $existing['attemptId'] ) || ! is_string( $existing['attemptId'] ) ) {
			return;
		}
		if ( null !== $attempt_id && ! hash_equals( $existing['attemptId'], $attempt_id ) ) {
			return;
		}
		delete_option( $lock_key );
		update_post_meta( $order->get_id(), $this->payment_attempt_failure_meta_key(), array(
			'attemptId' => $existing['attemptId'],
			'failedAt' => time(),
			'reason' => sanitize_key( $reason ),
		) );
	}

	/** Persists the redirect before the official gateway exits the PHP request. */
	public function capture_payment_gateway_redirect( $location, $status ) {
		if ( ! is_array( $this->active_payment_attempt ) ) {
			return $location;
		}
		$redirect = $this->trusted_zarinpal_redirect( $location );
		if ( ! $redirect ) {
			return $location;
		}
		$lock_key = isset( $this->active_payment_attempt['lockKey'] ) ? $this->active_payment_attempt['lockKey'] : '';
		$attempt_id = isset( $this->active_payment_attempt['attemptId'] ) ? $this->active_payment_attempt['attemptId'] : '';
		$existing = $lock_key ? get_option( $lock_key, false ) : false;
		if ( is_array( $existing ) && isset( $existing['attemptId'] ) && is_string( $existing['attemptId'] ) && hash_equals( $existing['attemptId'], $attempt_id ) ) {
			$existing['redirectUrl'] = $redirect;
			$existing['redirectedAt'] = time();
			update_option( $lock_key, $existing, false );
			$this->active_payment_attempt['redirectCaptured'] = true;
			$this->payment_log( 'payment_authority_ready', array( 'order_id' => absint( $this->active_payment_attempt['orderId'] ), 'attempt_id' => $attempt_id, 'duration_ms' => max( 0, (int) round( ( microtime( true ) - $this->active_payment_attempt['startedAt'] ) * 1000 ) ) ) );
		}
		return $location;
	}

	/** Handles a gateway exit without redirect as a definite failure and frees the lock. */
	public function payment_attempt_shutdown() {
		if ( ! is_array( $this->active_payment_attempt ) ) {
			return;
		}
		$attempt = $this->active_payment_attempt;
		$this->active_payment_attempt = null;
		if ( ! empty( $attempt['redirectCaptured'] ) ) {
			return;
		}
		$order = function_exists( 'wc_get_order' ) ? wc_get_order( absint( $attempt['orderId'] ) ) : false;
		if ( $order ) {
			$this->release_payment_attempt( $order, $attempt['attemptId'], 'no_redirect' );
		}
		$this->payment_log( 'payment_gateway_start_failed', array( 'order_id' => absint( $attempt['orderId'] ), 'attempt_id' => $attempt['attemptId'], 'reason' => 'no_redirect', 'duration_ms' => max( 0, (int) round( ( microtime( true ) - $attempt['startedAt'] ) * 1000 ) ) ) );
	}

	/** Returns the configured frontend URL only when it is safe to use as a redirect target. */
	private function trusted_frontend_url() {
		$frontend = getenv( 'KADOCHI_FRONTEND_URL' );
		$frontend = is_string( $frontend ) ? trim( $frontend ) : '';
		$parts = $frontend ? wp_parse_url( $frontend ) : false;
		// This is a trusted deployment setting, not an outbound request target.
		// wp_http_validate_url() rejects the documented localhost development URL.
		if ( ! is_array( $parts ) || empty( $parts['host'] ) || empty( $parts['scheme'] ) || ! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
			return false;
		}
		return esc_url_raw( $frontend, array( 'http', 'https' ) );
	}

	/** Builds a trusted frontend result URL for a WooCommerce order. */
	private function frontend_checkout_result_url( $result, $order ) {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_id' ) || ! in_array( $result, array( 'return', 'failure' ), true ) ) {
			return false;
		}
		$frontend = $this->trusted_frontend_url();
		if ( ! $frontend ) {
			return false;
		}
		return add_query_arg( 'order', absint( $order->get_id() ), trailingslashit( $frontend ) . 'checkout/' . $result );
	}

	private function order_money( $order ) {
		$minor_unit = function_exists( 'wc_get_price_decimals' ) ? max( 0, (int) wc_get_price_decimals() ) : 0;
		return $this->money_value( $order->get_total(), $order->get_currency(), $minor_unit );
	}

	/** Converts Woo decimal values to the same exact-money representation used by the Store API. */
	private function money_value( $value, $currency, $minor_unit = null ) {
		$minor_unit = null === $minor_unit ? ( function_exists( 'wc_get_price_decimals' ) ? max( 0, (int) wc_get_price_decimals() ) : 0 ) : max( 0, (int) $minor_unit );
		$total = function_exists( 'wc_format_decimal' ) ? wc_format_decimal( $value, $minor_unit ) : (string) $value;
		$parts = explode( '.', (string) $total, 2 );
		$integer = preg_replace( '/\\D/', '', $parts[0] );
		$fraction = isset( $parts[1] ) ? preg_replace( '/\\D/', '', $parts[1] ) : '';
		$amount = ltrim( ( $integer ?: '0' ) . str_pad( substr( $fraction, 0, $minor_unit ), $minor_unit, '0' ), '0' );
		return array( 'amount' => '' === $amount ? '0' : $amount, 'currencyCode' => sanitize_text_field( $currency ), 'minorUnit' => $minor_unit );
	}

	private function owned_order( $order_id ) {
		if ( ! function_exists( 'wc_get_order' ) ) {
			return $this->auth_error( 'kadochi_orders_unavailable', __( 'The order service is unavailable.', 'kadochi-core' ), 503 );
		}
		$order = wc_get_order( absint( $order_id ) );
		if ( ! $order || (int) $order->get_customer_id() !== get_current_user_id() ) {
			return $this->auth_error( 'kadochi_order_not_found', __( 'Order not found.', 'kadochi-core' ), 404 );
		}
		return $order;
	}

	private function is_draft_order( $order ) {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_status' ) ) {
			return false;
		}
		return in_array( sanitize_key( $order->get_status() ), array( 'draft', 'checkout-draft' ), true );
	}

	private function expire_draft_order_if_needed( $order ) {
		if ( ! $this->is_draft_order( $order ) || ! method_exists( $order, 'get_date_created' ) ) {
			return false;
		}
		$created = $order->get_date_created();
		if ( ! $created || $created->getTimestamp() > time() - self::DRAFT_ORDER_EXPIRATION_SECONDS ) {
			return false;
		}
		$order->update_status( 'cancelled', __( 'Unpaid draft expired after one hour.', 'kadochi-core' ) );
		return true;
	}

	/** Runs frequently enough to expire drafts promptly; request paths also enforce this rule. */
	public function schedule_draft_order_expiry() {
		if ( ! wp_next_scheduled( self::DRAFT_ORDER_EXPIRY_HOOK ) ) {
			wp_schedule_event( time() + 300, 'kadochi_every_five_minutes', self::DRAFT_ORDER_EXPIRY_HOOK );
		}
	}

	public function draft_order_expiry_schedule( $schedules ) {
		$schedules['kadochi_every_five_minutes'] = array( 'interval' => 300, 'display' => __( 'Every five minutes', 'kadochi-core' ) );
		return $schedules;
	}

	/** Schedules daily personal-occasion reminders; WP-Cron runs them on the next site visit if needed. */
	public function schedule_notification_reminders() {
		if ( ! wp_next_scheduled( self::NOTIFICATION_REMINDER_HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', self::NOTIFICATION_REMINDER_HOOK );
		}
	}

	/** Creates exactly one notification for each personal occasion due in three days. */
	public function send_occasion_notifications() {
		$timezone = function_exists( 'wp_timezone' ) ? wp_timezone() : new DateTimeZone( 'UTC' );
		$target = ( new DateTimeImmutable( 'today', $timezone ) )->modify( '+3 days' );
		$target_date = $target->format( 'Y-m-d' );
		$target_month_day = $target->format( 'm-d' );
		$occasions = get_posts( array( 'post_type' => 'occasion', 'post_status' => 'publish', 'numberposts' => -1 ) );
		foreach ( $occasions as $occasion ) {
			if ( ! $occasion instanceof WP_Post || $this->public_occasion( $occasion ) ) {
				continue;
			}
			$date = (string) $this->value( $occasion->ID, 'occasion_date' );
			$repeats_annually = '1' === (string) $this->value( $occasion->ID, 'repeat_annually' );
			$is_due = $repeats_annually ? substr( $date, 5 ) === $target_month_day : $date === $target_date;
			if ( ! $is_due || ! $this->valid_date( $date ) ) {
				continue;
			}
			$title = sanitize_text_field( (string) $this->value( $occasion->ID, 'title' ) ?: $occasion->post_title );
			$this->create_notification( (int) $occasion->post_author, 'occasion-' . absint( $occasion->ID ) . '-' . $target_date, 'occasion_reminder', sprintf( 'مناسبت شخصی «%s» سه روز دیگر است.', $title ) );
		}
	}

	public function expire_stale_draft_orders() {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return;
		}
		foreach ( array( 'draft', 'checkout-draft' ) as $status ) {
			$page = 1;
			do {
				$result = wc_get_orders( array(
					'status' => $status,
					'limit' => 100,
					'page' => $page,
					'paginate' => true,
					'date_created' => '<' . ( time() - self::DRAFT_ORDER_EXPIRATION_SECONDS ),
				) );
				$orders = is_object( $result ) && isset( $result->orders ) && is_array( $result->orders ) ? $result->orders : array();
				foreach ( $orders as $order ) {
					$this->expire_draft_order_if_needed( $order );
				}
				$page++;
			} while ( ! empty( $orders ) && is_object( $result ) && isset( $result->max_num_pages ) && $page <= (int) $result->max_num_pages );
		}
	}

	private function order_summary_dto( $order ) {
		$created = $order->get_date_created();
		$shipping_parts = array_filter( array( $order->get_shipping_state(), $order->get_shipping_city(), $order->get_shipping_address_1(), $order->get_shipping_address_2() ) );
		return array(
			'id' => (int) $order->get_id(),
			'paid' => (bool) $order->is_paid(),
			'status' => sanitize_key( $order->get_status() ),
			'createdAt' => $created ? $created->date( 'c' ) : gmdate( 'c' ),
			'total' => $this->order_money( $order ),
			'sender' => trim( sanitize_text_field( $order->get_billing_first_name() ) . ' ' . sanitize_text_field( $order->get_billing_last_name() ) ),
			'recipient' => array( 'firstName' => sanitize_text_field( $order->get_shipping_first_name() ), 'lastName' => sanitize_text_field( $order->get_shipping_last_name() ) ),
			'deliverySlot' => ( $slot = $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_DELIVERY_SLOT, true ) ) ? sanitize_text_field( $slot ) : null,
			'address' => implode( '، ', array_map( 'sanitize_text_field', $shipping_parts ) ),
		);
	}

	public function order_summary( WP_REST_Request $request ) {
		$order = $this->owned_order( $request['id'] );
		return is_wp_error( $order ) ? $order : rest_ensure_response( $this->order_summary_dto( $order ) );
	}

	private function profile_order_item_dto( $item ) {
		$product = is_object( $item ) && method_exists( $item, 'get_product' ) ? $item->get_product() : null;
		$image = null;
		if ( $product && method_exists( $product, 'get_image_id' ) && function_exists( 'wp_get_attachment_image_url' ) ) {
			$image = wp_get_attachment_image_url( $product->get_image_id(), 'woocommerce_thumbnail' );
		}
		return array(
			'id' => is_object( $item ) && method_exists( $item, 'get_id' ) ? (int) $item->get_id() : 0,
			'name' => is_object( $item ) && method_exists( $item, 'get_name' ) ? sanitize_text_field( $item->get_name() ) : '',
			'quantity' => is_object( $item ) && method_exists( $item, 'get_quantity' ) ? max( 0, (int) $item->get_quantity() ) : 0,
			'imageUrl' => $image ? esc_url_raw( $image ) : null,
		);
	}

	private function profile_order_summary_dto( $order ) {
		$created = $order->get_date_created();
		$items = array();
		foreach ( $order->get_items( 'line_item' ) as $item ) {
			$items[] = $this->profile_order_item_dto( $item );
		}
		return array(
			'id' => (int) $order->get_id(),
			'status' => sanitize_key( $order->get_status() ),
			'createdAt' => $created ? $created->date( 'c' ) : gmdate( 'c' ),
			'total' => $this->order_money( $order ),
			'items' => $items,
		);
	}

	public function list_profile_orders( WP_REST_Request $request ) {
		if ( ! function_exists( 'wc_get_orders' ) || ! function_exists( 'wc_get_order_statuses' ) ) {
			return $this->auth_error( 'kadochi_orders_unavailable', __( 'The order service is unavailable.', 'kadochi-core' ), 503 );
		}
		$page = min( 100000, max( 1, absint( $request->get_param( 'page' ) ?: 1 ) ) );
		$per_page = min( 50, max( 1, absint( $request->get_param( 'perPage' ) ?: 20 ) ) );
		$result = wc_get_orders( array(
			'customer_id' => get_current_user_id(),
			'limit' => $per_page,
			'page' => $page,
			'paginate' => true,
			'status' => array_keys( wc_get_order_statuses() ),
			'orderby' => 'date',
			'order' => 'DESC',
		) );
		$orders = is_object( $result ) && isset( $result->orders ) && is_array( $result->orders ) ? $result->orders : array();
		$items = array();
		foreach ( $orders as $order ) {
			$this->expire_draft_order_if_needed( $order );
			$items[] = $this->profile_order_summary_dto( $order );
		}
		$total = is_object( $result ) && isset( $result->total ) ? max( 0, (int) $result->total ) : count( $items );
		$total_pages = is_object( $result ) && isset( $result->max_num_pages ) ? max( 0, (int) $result->max_num_pages ) : ( $total ? 1 : 0 );
		return rest_ensure_response( array( 'items' => $items, 'page' => $page, 'perPage' => $per_page, 'total' => $total, 'totalPages' => $total_pages ) );
	}

	private function profile_order_detail_dto( $order ) {
		$shipping_parts = array_filter( array( $order->get_shipping_state(), $order->get_shipping_city(), $order->get_shipping_address_1(), $order->get_shipping_address_2() ) );
		$items = array();
		foreach ( $order->get_items( 'line_item' ) as $item ) {
			$items[] = $this->profile_order_item_dto( $item );
		}
		$fees = method_exists( $order, 'get_total_fees' ) ? $order->get_total_fees() : 0;
		return array(
			'id' => (int) $order->get_id(),
			'status' => sanitize_key( $order->get_status() ),
			'createdAt' => ( $created = $order->get_date_created() ) ? $created->date( 'c' ) : gmdate( 'c' ),
			// Keep the detail response compatible with the order-summary contract.
			// The frontend validates the shared `total` field before rendering.
			'total' => $this->order_money( $order ),
			'sender' => trim( sanitize_text_field( $order->get_billing_first_name() ) . ' ' . sanitize_text_field( $order->get_billing_last_name() ) ),
			'receiver' => trim( sanitize_text_field( $order->get_shipping_first_name() ) . ' ' . sanitize_text_field( $order->get_shipping_last_name() ) ),
			'deliverySlot' => ( $slot = $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_DELIVERY_SLOT, true ) ) ? sanitize_text_field( $slot ) : null,
			'address' => implode( '، ', array_map( 'sanitize_text_field', $shipping_parts ) ),
			'postcardMessage' => ( $message = $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_POSTCARD, true ) ) ? sanitize_textarea_field( $message ) : null,
			'postcardDesignTitle' => ( $design_title = $order->get_meta( '_kadochi_postcard_design_title', true ) ) ? sanitize_text_field( $design_title ) : null,
			'items' => $items,
			'summary' => array(
				'subtotal' => $this->money_value( $order->get_subtotal(), $order->get_currency() ),
				'shipping' => $this->money_value( $order->get_shipping_total(), $order->get_currency() ),
				'service' => $this->money_value( $fees, $order->get_currency() ),
				'tax' => $this->money_value( $order->get_total_tax(), $order->get_currency() ),
				'discount' => $this->money_value( $order->get_discount_total(), $order->get_currency() ),
				'total' => $this->order_money( $order ),
			),
		);
	}

	public function profile_order_detail( WP_REST_Request $request ) {
		$order = $this->owned_order( $request['id'] );
		if ( is_wp_error( $order ) ) {
			return $order;
		}
		$this->expire_draft_order_if_needed( $order );
		return rest_ensure_response( $this->profile_order_detail_dto( $order ) );
	}

	/** Shows the durable postcard selection beside the native additional checkout fields in wp-admin. */
	public function render_postcard_order_details( $order ) {
		if ( ! is_object( $order ) || ! method_exists( $order, 'get_meta' ) ) {
			return;
		}
		$message = sanitize_textarea_field( (string) $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_POSTCARD, true ) );
		$design_title = sanitize_text_field( (string) $order->get_meta( '_kadochi_postcard_design_title', true ) );
		if ( '' === $message && '' === $design_title ) {
			return;
		}
		echo '<div class="kadochi-postcard-order-details"><h3>' . esc_html__( 'Postcard', 'kadochi-core' ) . '</h3>';
		if ( '' !== $message ) {
			echo '<p><strong>' . esc_html__( 'Message:', 'kadochi-core' ) . '</strong> ' . nl2br( esc_html( $message ) ) . '</p>';
		}
		if ( '' !== $design_title ) {
			echo '<p><strong>' . esc_html__( 'Design:', 'kadochi-core' ) . '</strong> ' . esc_html( $design_title ) . '</p>';
		}
		echo '</div>';
	}

	/** Starts the configured gateway only for the owner's still-active unpaid order. */
	public function retry_profile_order_payment( WP_REST_Request $request ) {
		$input = $request->get_json_params();
		$attempt_id = is_array( $input ) && isset( $input['attemptId'] ) ? sanitize_text_field( (string) $input['attemptId'] ) : '';
		if ( ! $this->valid_payment_attempt_id( $attempt_id ) ) {
			return $this->auth_error( 'kadochi_invalid_payment_attempt', __( 'A valid payment attempt is required.', 'kadochi-core' ), 400 );
		}
		$order = $this->owned_order( $request['id'] );
		if ( is_wp_error( $order ) ) {
			return $order;
		}
		$this->expire_draft_order_if_needed( $order );
		if ( ! in_array( sanitize_key( $order->get_status() ), array( 'draft', 'checkout-draft', 'pending', 'pending-payment', 'failed' ), true ) ) {
			$this->payment_log( 'payment_start_rejected', array( 'order_id' => absint( $order->get_id() ), 'reason' => 'not_payable' ) );
			return $this->auth_error( 'kadochi_order_not_payable', __( 'This order is no longer awaiting payment.', 'kadochi-core' ), 409 );
		}
		if ( $order->is_paid() || $this->payment_method_id() !== $order->get_payment_method() ) {
			$this->payment_log( 'payment_start_rejected', array( 'order_id' => absint( $order->get_id() ), 'reason' => 'gateway_mismatch_or_paid' ) );
			return $this->auth_error( 'kadochi_order_not_payable', __( 'This order cannot be paid with the configured gateway.', 'kadochi-core' ), 409 );
		}
		$attempt = $this->begin_payment_attempt( $order, $attempt_id );
		if ( is_wp_error( $attempt ) ) {
			return $attempt;
		}
		if ( is_array( $attempt ) && isset( $attempt['redirectUrl'] ) ) {
			return rest_ensure_response( $attempt );
		}
		$woocommerce = function_exists( 'WC' ) ? WC() : null;
		$gateway_manager = is_object( $woocommerce ) && method_exists( $woocommerce, 'payment_gateways' ) ? $woocommerce->payment_gateways() : null;
		$gateways = is_object( $gateway_manager ) && method_exists( $gateway_manager, 'payment_gateways' ) ? $gateway_manager->payment_gateways() : array();
		$gateway = isset( $gateways[ $this->payment_method_id() ] ) ? $gateways[ $this->payment_method_id() ] : null;
		if ( ! $gateway || ! method_exists( $gateway, 'process_payment' ) ) {
			$this->release_payment_attempt( $order, $attempt_id, 'gateway_unavailable' );
			$this->payment_log( 'payment_gateway_unavailable', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id ) );
			return $this->auth_error( 'kadochi_payment_unavailable', __( 'The payment gateway is unavailable.', 'kadochi-core' ), 503 );
		}
		// The official ZarinPal gateway's process_payment() intentionally returns
		// WooCommerce's order-pay page. Its public handoff method creates the real
		// ZarinPal authority and responds with the gateway redirect instead.
		if ( 'WC_ZPal' === $this->payment_method_id() && method_exists( $gateway, 'Send_to_ZarinPal_Gateway' ) ) {
			$started_at = microtime( true );
			$this->active_payment_attempt = array(
				'orderId' => absint( $order->get_id() ),
				'attemptId' => $attempt_id,
				'lockKey' => $this->payment_attempt_lock_key( $order ),
				'startedAt' => $started_at,
				'redirectCaptured' => false,
			);
			add_filter( 'wp_redirect', array( $this, 'capture_payment_gateway_redirect' ), 999, 2 );
			register_shutdown_function( array( $this, 'payment_attempt_shutdown' ) );
			$this->payment_log( 'payment_start_requested', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id ) );
			$gateway->Send_to_ZarinPal_Gateway( $order->get_id() );
			remove_filter( 'wp_redirect', array( $this, 'capture_payment_gateway_redirect' ), 999 );
			$this->active_payment_attempt = null;
			$this->release_payment_attempt( $order, $attempt_id, 'no_redirect' );
			$this->payment_log( 'payment_gateway_start_failed', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id, 'reason' => 'no_redirect', 'duration_ms' => max( 0, (int) round( ( microtime( true ) - $started_at ) * 1000 ) ) ) );
			return $this->auth_error( 'kadochi_payment_unavailable', __( 'The payment gateway could not start a payment.', 'kadochi-core' ), 502 );
		}
		$result = $gateway->process_payment( $order->get_id() );
		$redirect = is_array( $result ) && isset( $result['redirect'] ) ? esc_url_raw( $result['redirect'], array( 'http', 'https' ) ) : '';
		if ( ! $redirect ) {
			$this->release_payment_attempt( $order, $attempt_id, 'invalid_redirect' );
			$this->payment_log( 'payment_gateway_start_failed', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id, 'reason' => 'invalid_redirect' ) );
			return $this->auth_error( 'kadochi_payment_unavailable', __( 'The payment gateway could not start a payment.', 'kadochi-core' ), 502 );
		}
		$this->payment_log( 'payment_start_redirect_ready', array( 'order_id' => absint( $order->get_id() ), 'attempt_id' => $attempt_id ) );
		return rest_ensure_response( array( 'redirectUrl' => $redirect ) );
	}

	public function operation_summary( WP_REST_Request $request ) {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return $this->auth_error( 'kadochi_orders_unavailable', __( 'The order service is unavailable.', 'kadochi-core' ), 503 );
		}
		$operation = sanitize_text_field( $request['operation'] );
		if ( ! preg_match( '/^[a-f0-9-]{36}$/i', $operation ) ) {
			return $this->auth_error( 'kadochi_order_not_found', __( 'Order not found.', 'kadochi-core' ), 404 );
		}
		$orders = wc_get_orders( array( 'customer_id' => get_current_user_id(), 'limit' => 1, 'meta_key' => $this->checkout_operation_meta_key(), 'meta_value' => $operation, 'orderby' => 'date', 'order' => 'DESC' ) );
		if ( empty( $orders ) ) {
			$orders = wc_get_orders( array( 'customer_id' => get_current_user_id(), 'limit' => 1, 'meta_key' => '_kadochi_checkout_operation', 'meta_value' => $operation, 'orderby' => 'date', 'order' => 'DESC' ) );
		}
		return empty( $orders ) ? $this->auth_error( 'kadochi_order_not_found', __( 'Order not found.', 'kadochi-core' ), 404 ) : rest_ensure_response( $this->order_summary_dto( $orders[0] ) );
	}

	private function review_product( $product_id ) {
		if ( ! function_exists( 'wc_get_product' ) ) {
			return $this->auth_error( 'kadochi_reviews_unavailable', __( 'The reviews service is unavailable.', 'kadochi-core' ), 503 );
		}
		$product = wc_get_product( absint( $product_id ) );
		return $product ? $product : $this->auth_error( 'kadochi_product_not_found', __( 'The product was not found.', 'kadochi-core' ), 404 );
	}

	private function review_dto( $comment ) {
		$avatar = esc_url_raw( get_avatar_url( $comment, array( 'size' => 96 ) ) );
		$rating = get_comment_meta( $comment->comment_ID, 'rating', true );
		return array(
			'id' => (int) $comment->comment_ID,
			'date_created' => mysql_to_rfc3339( $comment->comment_date_gmt ?: $comment->comment_date ),
			'product_id' => (int) $comment->comment_post_ID,
			'reviewer' => sanitize_text_field( $comment->comment_author ) ?: __( 'User', 'kadochi-core' ),
			'review' => wp_kses_post( $comment->comment_content ),
			// Product comments created in WordPress admin do not necessarily have a
			// WooCommerce rating. Keep those as comments instead of rendering a
			// misleading zero-star review in the storefront.
			'rating' => '' === $rating ? null : (int) $rating,
			'verified' => (bool) get_comment_meta( $comment->comment_ID, 'verified', true ),
			'reviewer_avatar_urls' => $avatar ? array( '96' => $avatar ) : array(),
		);
	}

	public function list_reviews( WP_REST_Request $request ) {
		$product = $this->review_product( $request->get_param( 'productId' ) );
		if ( is_wp_error( $product ) ) {
			return $product;
		}
		$page = max( 1, min( 100, absint( $request->get_param( 'page' ) ?: 1 ) ) );
		$per_page = max( 1, min( 50, absint( $request->get_param( 'per_page' ) ?: 10 ) ) );
		$comments = get_comments( array(
			'post_id' => $product->get_id(),
			// WooCommerce uses `review`; standard WordPress comments are stored
			// with an empty type (some extensions use `comment`).
			'type__in' => array( 'review', '', 'comment' ),
			'status' => 'approve',
			'number' => $per_page,
			'offset' => ( $page - 1 ) * $per_page,
			'orderby' => 'comment_date_gmt',
			'order' => 'DESC',
		) );
		return rest_ensure_response( array_map( array( $this, 'review_dto' ), $comments ) );
	}

	public function create_review( WP_REST_Request $request ) {
		$product = $this->review_product( $request->get_param( 'productId' ) );
		if ( is_wp_error( $product ) ) {
			return $product;
		}
		if ( ! comments_open( $product->get_id() ) ) {
			return $this->auth_error( 'kadochi_reviews_closed', __( 'Reviews are not available for this product.', 'kadochi-core' ), 403 );
		}

		$content = trim( wp_kses_post( (string) $request->get_param( 'content' ) ) );
		$content_length = $this->string_length( wp_strip_all_tags( $content ) );
		$rating = absint( $request->get_param( 'rating' ) );
		if ( $content_length < 3 || $content_length > 1000 || $rating < 1 || $rating > 5 ) {
			return $this->auth_error( 'kadochi_invalid_review', __( 'The review content or rating is invalid.', 'kadochi-core' ), 400 );
		}

		$user = wp_get_current_user();
		$comment_id = wp_insert_comment( array(
			'comment_post_ID' => $product->get_id(),
			'comment_author' => sanitize_text_field( $user->display_name ?: $user->user_login ),
			'comment_author_email' => sanitize_email( $user->user_email ),
			'comment_content' => $content,
			'comment_type' => 'review',
			'comment_approved' => 0,
			'user_id' => (int) $user->ID,
		) );
		if ( ! $comment_id ) {
			return $this->auth_error( 'kadochi_review_create_failed', __( 'The review could not be submitted.', 'kadochi-core' ), 500 );
		}
		update_comment_meta( $comment_id, 'rating', $rating );
		return rest_ensure_response( array( 'id' => (int) $comment_id, 'status' => 'pending' ) );
	}

	/** Returns a published editorial post, rejecting other post types and drafts. */
	private function comment_post( $post_id ) {
		$post = get_post( absint( $post_id ) );
		if ( ! $post || 'post' !== $post->post_type || 'publish' !== $post->post_status ) {
			return $this->auth_error( 'kadochi_post_not_found', __( 'The article was not found.', 'kadochi-core' ), 404 );
		}
		return $post;
	}

	private function post_comment_dto( $comment ) {
		$avatar = esc_url_raw( get_avatar_url( $comment, array( 'size' => 96 ) ) );
		return array(
			'id' => (int) $comment->comment_ID,
			'date_created' => mysql_to_rfc3339( $comment->comment_date_gmt ?: $comment->comment_date ),
			'post_id' => (int) $comment->comment_post_ID,
			'author' => sanitize_text_field( $comment->comment_author ) ?: __( 'User', 'kadochi-core' ),
			'content' => wp_kses_post( $comment->comment_content ),
			'author_avatar_urls' => $avatar ? array( '96' => $avatar ) : array(),
		);
	}

	/** Lists approved, top-level comments for a magazine article. */
	public function list_post_comments( WP_REST_Request $request ) {
		$post = $this->comment_post( $request->get_param( 'postId' ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		$page = max( 1, min( 100, absint( $request->get_param( 'page' ) ?: 1 ) ) );
		$per_page = max( 1, min( 50, absint( $request->get_param( 'per_page' ) ?: 10 ) ) );
		$comments = get_comments( array(
			'post_id' => $post->ID,
			// WordPress core uses an empty type for ordinary comments; a few
			// integrations explicitly set it to `comment`.
			'type__in' => array( '', 'comment' ),
			'status' => 'approve',
			'parent' => 0,
			'number' => $per_page,
			'offset' => ( $page - 1 ) * $per_page,
			'orderby' => 'comment_date_gmt',
			'order' => 'DESC',
		) );
		return rest_ensure_response( array_map( array( $this, 'post_comment_dto' ), $comments ) );
	}

	/** Stores an authenticated reader's comment pending editorial moderation. */
	public function create_post_comment( WP_REST_Request $request ) {
		$post = $this->comment_post( $request->get_param( 'postId' ) );
		if ( is_wp_error( $post ) ) {
			return $post;
		}
		if ( ! comments_open( $post->ID ) ) {
			return $this->auth_error( 'kadochi_comments_closed', __( 'Comments are not available for this article.', 'kadochi-core' ), 403 );
		}

		$content = trim( wp_kses_post( (string) $request->get_param( 'content' ) ) );
		$content_length = $this->string_length( wp_strip_all_tags( $content ) );
		if ( $content_length < 3 || $content_length > 1000 ) {
			return $this->auth_error( 'kadochi_invalid_comment', __( 'The comment content is invalid.', 'kadochi-core' ), 400 );
		}

		$user = wp_get_current_user();
		$comment_id = wp_insert_comment( array(
			'comment_post_ID' => $post->ID,
			'comment_author' => sanitize_text_field( $user->display_name ?: $user->user_login ),
			'comment_author_email' => sanitize_email( $user->user_email ),
			'comment_content' => $content,
			'comment_type' => 'comment',
			'comment_approved' => 0,
			'user_id' => (int) $user->ID,
		) );
		if ( ! $comment_id ) {
			return $this->auth_error( 'kadochi_comment_create_failed', __( 'The comment could not be submitted.', 'kadochi-core' ), 500 );
		}
		return rest_ensure_response( array( 'id' => (int) $comment_id, 'status' => 'pending' ) );
	}

	private function value( $post_id, $name ) {
		$value = function_exists( 'get_field' ) ? get_field( $name, $post_id ) : get_post_meta( $post_id, $name, true );
		return is_string( $value ) ? $value : $value;
	}

	private function image( $value ) {
		if ( is_array( $value ) ) {
			$url = isset( $value['url'] ) ? $value['url'] : '';
			$alt = isset( $value['alt'] ) ? $value['alt'] : '';
		} elseif ( is_numeric( $value ) ) {
			$url = wp_get_attachment_url( (int) $value );
			$alt = get_post_meta( (int) $value, '_wp_attachment_image_alt', true );
		} else {
			$url = $value;
			$alt = '';
		}
		$url = esc_url_raw( (string) $url );
		return $url ? array( 'url' => $url, 'alt' => sanitize_text_field( (string) $alt ) ) : null;
	}

	private function safe_url( $value ) {
		$value = esc_url_raw( (string) $value );
		return $value ? $value : null;
	}

	private function safe_gradient( $value ) {
		$value = trim( (string) $value );
		return preg_match( '/^linear-gradient\\((?:[-a-zA-Z0-9\\s(),.%#]+)\\)$/', $value ) ? $value : null;
	}

	private function published( $type, $orderby = 'menu_order date' ) {
		return get_posts( array( 'post_type' => $type, 'post_status' => 'publish', 'numberposts' => 50, 'orderby' => $orderby, 'order' => 'ASC' ) );
	}

	/** Returns a currently selectable design, or false for stale/tampered checkout input. */
	private function postcard_design( $id ) {
		$id = absint( $id );
		$post = $id ? get_post( $id ) : null;
		if ( ! $post || 'postcard' !== $post->post_type || 'publish' !== $post->post_status ) {
			return false;
		}
		$image_url = function_exists( 'wp_get_attachment_image_url' ) ? wp_get_attachment_image_url( get_post_thumbnail_id( $post->ID ), 'medium_large' ) : false;
		$title = sanitize_text_field( $post->post_title );
		if ( ! $image_url || '' === $title ) {
			return false;
		}
		return array( 'id' => (int) $post->ID, 'title' => $title, 'imageUrl' => esc_url_raw( $image_url ) );
	}

	/** Checkout-friendly list of the published, image-backed designs managed in wp-admin. */
	public function postcard_designs() {
		$items = array();
		foreach ( $this->published( 'postcard' ) as $post ) {
			$design = $this->postcard_design( $post->ID );
			if ( $design ) {
				$items[] = $design;
			}
		}
		return rest_ensure_response( array( 'items' => $items ) );
	}

	/** Returns only image-backed stories that are still within their 48-hour lifetime. */
	private function active_stories() {
		$query = new WP_Query( array(
			'post_type' => 'story',
			'post_status' => 'publish',
			'posts_per_page' => 50,
			'orderby' => 'date',
			'order' => 'DESC',
			'date_query' => array( array(
				'column' => 'post_date_gmt',
				'after' => gmdate( 'Y-m-d H:i:s', time() - self::STORY_VISIBILITY_SECONDS ),
				'inclusive' => true,
			) ),
			'no_found_rows' => true,
		) );

		return array_values( array_filter( array_map( function ( $post ) {
			$image = $this->image( get_post_thumbnail_id( $post->ID ) );
			if ( ! $image ) {
				return null;
			}
			return array(
				'id' => (int) $post->ID,
				'title' => sanitize_text_field( $post->post_title ),
				'image' => $image,
				'publishedAt' => get_post_time( 'Y-m-d\\TH:i:s\\Z', true, $post ),
			);
		}, $query->posts ) ) );
	}

	public function homepage_content() {
		$banners = array_map( function ( $post ) { return array( 'id' => (int) $post->ID, 'title' => sanitize_text_field( $this->value( $post->ID, 'title' ) ?: $post->post_title ), 'subtitle' => sanitize_text_field( $this->value( $post->ID, 'subtitle' ) ), 'ctaText' => sanitize_text_field( $this->value( $post->ID, 'cta_text' ) ), 'ctaLink' => $this->safe_url( $this->value( $post->ID, 'cta_link' ) ), 'backgroundGradient' => $this->safe_gradient( $this->value( $post->ID, 'background_gradient' ) ), 'backgroundImage' => $this->image( $this->value( $post->ID, 'background_image' ) ) ); }, $this->published( 'banner' ) );
		$heroes = array_map( function ( $post ) { return array( 'id' => (int) $post->ID, 'title' => sanitize_text_field( $this->value( $post->ID, 'title' ) ?: $post->post_title ), 'subtitle' => sanitize_text_field( $this->value( $post->ID, 'subtitle' ) ), 'ctaText' => sanitize_text_field( $this->value( $post->ID, 'cta_text' ) ), 'ctaLink' => $this->safe_url( $this->value( $post->ID, 'cta_link' ) ), 'backgroundImage' => $this->image( $this->value( $post->ID, 'background_image' ) ) ); }, $this->published( 'hero', 'date' ) );
		$sliders = array_map( function ( $post ) { return array( 'id' => (int) $post->ID, 'sliderTitle' => sanitize_text_field( $this->value( $post->ID, 'slider_title' ) ), 'sliderButtonText' => sanitize_text_field( $this->value( $post->ID, 'slider_button_text' ) ), 'sliderLink' => $this->safe_url( $this->value( $post->ID, 'slider_link' ) ), 'backgroundImage' => $this->image( $this->value( $post->ID, 'background_image' ) ) ); }, $this->published( 'slider' ) );
		$stories = $this->active_stories();
		return rest_ensure_response( compact( 'banners', 'heroes', 'sliders', 'stories' ) );
	}

	private function valid_date( $date ) {
		if ( ! is_string( $date ) || ! preg_match( '/^\\d{4}-\\d{2}-\\d{2}$/', $date ) ) return false;
		$parsed = DateTime::createFromFormat( '!Y-m-d', $date );
		return $parsed && $parsed->format( 'Y-m-d' ) === $date;
	}

	/** Admin-authored occasions are public; every other occasion belongs only to its author. */
	private function public_occasion( $post ) {
		return $post && user_can( (int) $post->post_author, 'manage_options' );
	}

	private function public_occasion_author_ids() {
		static $ids = null;
		if ( null === $ids ) {
			$ids = array_map( 'absint', get_users( array( 'capability' => 'manage_options', 'fields' => 'ids', 'number' => -1 ) ) );
		}
		return $ids;
	}

	private function visible_occasion( $id ) {
		$post = get_post( (int) $id );
		if ( ! $post || 'occasion' !== $post->post_type || ( 'publish' !== $post->post_status ) || ( ! $this->public_occasion( $post ) && (int) $post->post_author !== get_current_user_id() ) ) return new WP_Error( 'kadochi_occasion_not_found', __( 'Occasion not found.', 'kadochi-core' ), array( 'status' => 404 ) );
		return $post;
	}

	private function owned_personal_occasion( $id ) {
		$post = $this->visible_occasion( $id );
		if ( is_wp_error( $post ) || $this->public_occasion( $post ) || (int) $post->post_author !== get_current_user_id() ) return new WP_Error( 'kadochi_occasion_not_found', __( 'Occasion not found.', 'kadochi-core' ), array( 'status' => 404 ) );
		return $post;
	}

	private function occasion_dto( $post ) {
		$title = $this->value( $post->ID, 'title' );
		return array( 'id' => (int) $post->ID, 'title' => sanitize_text_field( $title ?: $post->post_title ), 'occasionDate' => sanitize_text_field( (string) $this->value( $post->ID, 'occasion_date' ) ), 'isPersonal' => ! $this->public_occasion( $post ), 'repeatsAnnually' => '1' === (string) $this->value( $post->ID, 'repeat_annually' ), 'version' => get_post_modified_time( 'c', true, $post ) );
	}

	private function params( WP_REST_Request $request ) { $params = $request->get_json_params(); return is_array( $params ) ? $params : array(); }

	public function list_occasions( WP_REST_Request $request ) {
		$page = max( 1, min( 100, (int) $request->get_param( 'page' ) ) );
		$per_page = max( 1, min( 50, (int) $request->get_param( 'per_page' ) ?: 20 ) );
		$authors = $this->public_occasion_author_ids();
		$current_user_id = get_current_user_id();
		if ( $current_user_id ) $authors[] = $current_user_id;
		$query = new WP_Query( array( 'post_type' => 'occasion', 'post_status' => 'publish', 'author__in' => $authors, 'paged' => $page, 'posts_per_page' => $per_page, 'orderby' => 'date', 'order' => 'DESC', 'no_found_rows' => false ) );
		return rest_ensure_response( array( 'items' => array_map( array( $this, 'occasion_dto' ), $query->posts ), 'page' => $page, 'perPage' => $per_page, 'total' => (int) $query->found_posts, 'totalPages' => (int) $query->max_num_pages ) );
	}

	public function get_occasion( WP_REST_Request $request ) { $post = $this->visible_occasion( $request['id'] ); return is_wp_error( $post ) ? $post : rest_ensure_response( $this->occasion_dto( $post ) ); }

	public function create_occasion( WP_REST_Request $request ) {
		$input = $this->params( $request ); $title = isset( $input['title'] ) ? sanitize_text_field( $input['title'] ) : ''; $date = isset( $input['occasionDate'] ) ? $input['occasionDate'] : ''; $repeats_annually = ! isset( $input['repeatsAnnually'] ) || true === $input['repeatsAnnually'];
		if ( '' === $title || strlen( $title ) > 120 || ! $this->valid_date( $date ) || ( isset( $input['repeatsAnnually'] ) && ! is_bool( $input['repeatsAnnually'] ) ) ) return new WP_Error( 'kadochi_invalid_occasion', __( 'A title and a valid occasion date are required.', 'kadochi-core' ), array( 'status' => 400 ) );
		$id = wp_insert_post( array( 'post_type' => 'occasion', 'post_status' => 'publish', 'post_title' => $title, 'post_author' => get_current_user_id() ), true );
		if ( is_wp_error( $id ) ) return $id;
		update_post_meta( $id, 'title', $title ); update_post_meta( $id, 'occasion_date', $date ); update_post_meta( $id, 'repeat_annually', $repeats_annually ? '1' : '0' ); update_post_meta( $id, 'user', get_current_user_id() );
		return new WP_REST_Response( $this->occasion_dto( get_post( $id ) ), 201 );
	}

	private function check_version( $post, $input ) { return isset( $input['version'] ) && hash_equals( get_post_modified_time( 'c', true, $post ), (string) $input['version'] ); }
	public function update_occasion( WP_REST_Request $request ) {
		$post = $this->owned_personal_occasion( $request['id'] ); if ( is_wp_error( $post ) ) return $post; $input = $this->params( $request );
		if ( ! $this->check_version( $post, $input ) ) return new WP_Error( 'kadochi_occasion_conflict', __( 'The occasion has changed. Refresh and try again.', 'kadochi-core' ), array( 'status' => 409 ) );
		if ( isset( $input['title'] ) ) { $title = sanitize_text_field( $input['title'] ); if ( '' === $title || strlen( $title ) > 120 ) return new WP_Error( 'kadochi_invalid_occasion', __( 'A valid title is required.', 'kadochi-core' ), array( 'status' => 400 ) ); wp_update_post( array( 'ID' => $post->ID, 'post_title' => $title ) ); update_post_meta( $post->ID, 'title', $title ); }
		if ( isset( $input['occasionDate'] ) ) { if ( ! $this->valid_date( $input['occasionDate'] ) ) return new WP_Error( 'kadochi_invalid_occasion', __( 'A valid occasion date is required.', 'kadochi-core' ), array( 'status' => 400 ) ); update_post_meta( $post->ID, 'occasion_date', $input['occasionDate'] ); }
		if ( isset( $input['repeatsAnnually'] ) ) { if ( ! is_bool( $input['repeatsAnnually'] ) ) return new WP_Error( 'kadochi_invalid_occasion', __( 'The annual repeat setting is invalid.', 'kadochi-core' ), array( 'status' => 400 ) ); update_post_meta( $post->ID, 'repeat_annually', $input['repeatsAnnually'] ? '1' : '0' ); }
		update_post_meta( $post->ID, 'user', get_current_user_id() );
		return rest_ensure_response( $this->occasion_dto( get_post( $post->ID ) ) );
	}

	public function delete_occasion( WP_REST_Request $request ) {
		$post = $this->owned_personal_occasion( $request['id'] ); if ( is_wp_error( $post ) ) return $post; $input = $this->params( $request );
		if ( ! $this->check_version( $post, $input ) ) return new WP_Error( 'kadochi_occasion_conflict', __( 'The occasion has changed. Refresh and try again.', 'kadochi-core' ), array( 'status' => 409 ) );
		$result = wp_trash_post( $post->ID ); if ( ! $result ) return new WP_Error( 'kadochi_delete_failed', __( 'The occasion could not be deleted.', 'kadochi-core' ), array( 'status' => 500 ) );
		return rest_ensure_response( $this->occasion_dto( $post ) );
	}

	public function render_admin_notices() {
		foreach ( $this->health as $message ) echo '<div class="notice notice-error"><p>' . esc_html( $message ) . '</p></div>';
	}
}

$kadochi_core = new Kadochi_Core();
$kadochi_core->boot();
register_activation_hook( __FILE__, array( 'Kadochi_Core', 'activate' ) );
