<?php
/**
 * Plugin Name: Kadochi Core
 * Description: Durable headless content contracts and protected occasion records for Kadochi.
 * Version: 0.1.1
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
	const OTP_SEND_LIMIT_PER_HOUR = 3;
	const JWT_TTL_SECONDS = 604800;
	const CHECKOUT_FIELD_DELIVERY_SLOT = 'kadochi/delivery-slot';
	const CHECKOUT_FIELD_PACKAGING = 'kadochi/packaging';
	const CHECKOUT_FIELD_POSTCARD = 'kadochi/postcard';
	const CHECKOUT_FIELD_OPERATION = 'kadochi/operation-id';

	/** @var array<string, string> */
	private $health = array();
	/** @var WP_Error|null */
	private $bearer_error = null;

	public function boot() {
		add_action( 'init', array( $this, 'register_post_types' ), 5 );
		add_action( 'init', array( $this, 'harden_existing_occasion_type' ), 99 );
		add_action( 'acf/init', array( $this, 'register_scf_fields' ) );
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'rest_endpoints', array( $this, 'remove_default_occasion_routes' ) );
		add_filter( 'determine_current_user', array( $this, 'determine_current_user' ), 30 );
		add_filter( 'rest_authentication_errors', array( $this, 'rest_authentication_errors' ), 30 );
		add_action( 'woocommerce_init', array( $this, 'register_checkout_fields' ) );
		add_action( 'woocommerce_blocks_loaded', array( $this, 'register_store_api_data' ) );
		add_action( 'woocommerce_validate_additional_field', array( $this, 'validate_checkout_field' ), 10, 3 );
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( $this, 'validate_store_checkout_order' ), 10, 2 );
		add_action( 'woocommerce_store_api_checkout_order_processed', array( $this, 'lock_store_checkout_order' ), 1 );
		add_filter( 'woocommerce_get_return_url', array( $this, 'checkout_return_url' ), 20, 2 );
		add_action( 'admin_notices', array( $this, 'render_admin_notices' ) );
	}

	public static function activate() {
		self::grant_editorial_capabilities();
		flush_rewrite_rules();
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
		$types = array( 'slider' => array( 'slider', 'sliders' ), 'banner' => array( 'banner', 'banners' ), 'hero' => array( 'hero', 'heroes' ), 'occasion' => array( 'occasion', 'occasions' ) );
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

	public function register_post_types() {
		$this->register_post_type( 'slider', 'Sliders', 'Slider', array( 'title', 'editor', 'thumbnail' ), true, 'dashicons-images-alt2' );
		$this->register_post_type( 'banner', 'Banners', 'Banner', array( 'title', 'editor', 'thumbnail' ), true, 'dashicons-megaphone' );
		$this->register_post_type( 'hero', 'Heroes', 'Hero', array( 'title', 'editor', 'thumbnail' ), true, 'dashicons-superhero' );
		$this->register_post_type( 'occasion', 'Occasions', 'Occasion', array( 'title', 'editor', 'thumbnail', 'author' ), false, 'dashicons-calendar-alt' );
	}

	private function register_post_type( $slug, $plural_label, $singular_label, $supports, $legacy_public, $menu_icon ) {
		if ( post_type_exists( $slug ) ) {
			return;
		}
		$capability_bases = array(
			'slider'   => array( 'slider', 'sliders' ),
			'banner'   => array( 'banner', 'banners' ),
			'hero'     => array( 'hero', 'heroes' ),
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
			if ( function_exists( 'acf_get_field_group' ) && acf_get_field_group( $group['key'] ) ) {
				continue;
			}
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
			array( 'key' => 'group_68ff3b5e2403e', 'title' => 'Hero', 'fields' => array( $this->field( 'field_68ff3b5e2bc20', 'Title', 'title', 'text' ), $this->field( 'field_68ff3b5e2bccb', 'CTA Text', 'cta_text', 'text' ), $this->field( 'field_68ff3b5e2bd1c', 'CTA Link', 'cta_link', 'url' ), $this->field( 'field_68ff3b5e2bdb4', 'Background Image', 'background_image', 'image', $image_url ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'hero' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
			array( 'key' => 'group_684ada15be887', 'title' => 'Image Slider', 'fields' => array( $this->field( 'field_684ada1598922', 'Background Image', 'background_image', 'image', array( 'return_format' => 'array', 'library' => 'all', 'preview_size' => 'medium' ) ), $this->field( 'field_684ada7298923', 'Slider Title', 'slider_title', 'text' ), $this->field( 'field_684adaa998924', 'Slider Button Text', 'slider_button_text', 'text' ), $this->field( 'field_684adabd98925', 'Slider Link', 'slider_link', 'link', array( 'return_format' => 'url' ) ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'slider' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
			array( 'key' => 'group_68690d0e375df', 'title' => 'Occasion', 'fields' => array( $this->field( 'field_68690d0e8d04d', 'title', 'title', 'text' ), $this->field( 'field_68690d148d04e', 'occasion date', 'occasion_date', 'date_picker', array( 'display_format' => 'Y-m-d', 'return_format' => 'Y-m-d', 'first_day' => 6, 'default_to_current_date' => 0 ) ), $this->field( 'field_699c24f932f43', 'user', 'user', 'user', array( 'return_format' => 'id', 'multiple' => 0, 'allow_null' => 0 ) ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'occasion' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
		);
	}

	public function register_routes() {
		register_rest_route( self::REST_NAMESPACE, '/health', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'health_response' ), 'permission_callback' => function () { return current_user_can( 'manage_options' ); } ) );
		register_rest_route( self::REST_NAMESPACE, '/content/home', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'homepage_content' ), 'permission_callback' => '__return_true' ) );
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
		register_rest_route( self::REST_NAMESPACE, '/customer', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'customer' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/orders/(?P<id>\\d+)', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'order_summary' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/checkout/operations/(?P<operation>[a-f0-9-]{36})', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'operation_summary' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
		register_rest_route( self::REST_NAMESPACE, '/reviews', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_reviews' ), 'permission_callback' => '__return_true' ),
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'create_review' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/occasions', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'list_occasions' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( $this, 'create_occasion' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
		register_rest_route( self::REST_NAMESPACE, '/occasions/(?P<id>\\d+)', array(
			array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'get_occasion' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => 'PATCH', 'callback' => array( $this, 'update_occasion' ), 'permission_callback' => array( $this, 'authenticated' ) ),
			array( 'methods' => WP_REST_Server::DELETABLE, 'callback' => array( $this, 'delete_occasion' ), 'permission_callback' => array( $this, 'authenticated' ) ),
		) );
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

	private function auth_error( $code, $message, $status ) {
		return new WP_Error( $code, $message, array( 'status' => $status ) );
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

	private function cooldown_key( $phone ) {
		return $this->transient_key( 'otp_cooldown', $phone );
	}

	private function rate_key( $scope, $value ) {
		return $this->transient_key( 'otp_rate_' . $scope, $value );
	}

	private function counter_value( $key ) {
		$value = get_transient( $key );
		return is_array( $value ) && isset( $value['count'] ) ? max( 0, (int) $value['count'] ) : 0;
	}

	private function increment_counter( $key, $ttl ) {
		$count = $this->counter_value( $key ) + 1;
		set_transient( $key, array( 'count' => $count ), $ttl );
		return $count;
	}

	private function request_ip() {
		$ip = isset( $_SERVER['HTTP_X_KADOCHI_CLIENT_IP'] ) ? $_SERVER['HTTP_X_KADOCHI_CLIENT_IP'] : ( isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : 'unknown' );
		return substr( sanitize_text_field( (string) $ip ), 0, 200 ) ?: 'unknown';
	}

	private function otp_digest( $phone, $code ) {
		return hash_hmac( 'sha256', 'kadochi-otp-v1:' . $phone . ':' . $code, $this->jwt_key() );
	}

	private function relay_code( $phone ) {
		$url = getenv( 'MELIPAYAMAK_OTP_URL' );
		if ( ! is_string( $url ) || '' === trim( $url ) ) {
			return $this->auth_error( 'kadochi_otp_unavailable', __( 'The verification service is unavailable.', 'kadochi-core' ), 503 );
		}
		$response = wp_remote_post( $url, array(
			'timeout' => 8,
			'headers' => array( 'Accept' => 'application/json', 'Content-Type' => 'application/json' ),
			'body' => wp_json_encode( array( 'to' => $this->national_phone( $phone ) ) ),
		) );
		if ( is_wp_error( $response ) || (int) wp_remote_retrieve_response_code( $response ) < 200 || (int) wp_remote_retrieve_response_code( $response ) >= 300 ) {
			return $this->auth_error( 'kadochi_otp_provider_failed', __( 'The SMS service is unavailable.', 'kadochi-core' ), 502 );
		}
		$payload = json_decode( wp_remote_retrieve_body( $response ), true );
		$code = is_array( $payload ) && isset( $payload['code'] ) && is_string( $payload['code'] ) ? trim( $this->latin_digits( $payload['code'] ) ) : '';
		if ( ! preg_match( '/^\d{4,6}$/', $code ) ) {
			return $this->auth_error( 'kadochi_otp_provider_invalid', __( 'The SMS service returned an invalid response.', 'kadochi-core' ), 502 );
		}
		return $code;
	}

	public function start_otp( WP_REST_Request $request ) {
		$phone = $request->get_param( 'phone' );
		if ( $this->local_auth_enabled() ) {
			if ( '+989121234567' !== $phone ) {
				return $this->auth_error( 'kadochi_local_phone_required', __( 'Use the local development phone number.', 'kadochi-core' ), 400 );
			}
			return rest_ensure_response( array( 'expiresIn' => self::OTP_TTL_SECONDS, 'retryAfter' => self::OTP_RESEND_SECONDS, 'codeLength' => 4 ) );
		}

		$phone_rate_key = $this->rate_key( 'phone', $phone );
		$ip_rate_key = $this->rate_key( 'ip', $this->request_ip() );
		if ( get_transient( $this->cooldown_key( $phone ) ) ) {
			return $this->auth_error( 'kadochi_otp_cooldown', __( 'Please wait before requesting another verification code.', 'kadochi-core' ), 429 );
		}
		if ( $this->counter_value( $phone_rate_key ) >= self::OTP_SEND_LIMIT_PER_HOUR || $this->counter_value( $ip_rate_key ) >= self::OTP_SEND_LIMIT_PER_HOUR ) {
			return $this->auth_error( 'kadochi_otp_rate_limited', __( 'Too many verification-code requests. Please try again later.', 'kadochi-core' ), 429 );
		}

		$code = $this->relay_code( $phone );
		if ( is_wp_error( $code ) ) {
			return $code;
		}
		set_transient( $this->challenge_key( $phone ), array( 'digest' => $this->otp_digest( $phone, $code ), 'attempts' => 0, 'expiresAt' => time() + self::OTP_TTL_SECONDS ), self::OTP_TTL_SECONDS );
		set_transient( $this->cooldown_key( $phone ), true, self::OTP_RESEND_SECONDS );
		$this->increment_counter( $phone_rate_key, HOUR_IN_SECONDS );
		$this->increment_counter( $ip_rate_key, HOUR_IN_SECONDS );
		return rest_ensure_response( array( 'expiresIn' => self::OTP_TTL_SECONDS, 'retryAfter' => self::OTP_RESEND_SECONDS, 'codeLength' => strlen( $code ) ) );
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
				delete_transient( $challenge_key );
			} else {
				$challenge['attempts'] = $attempts;
				set_transient( $challenge_key, $challenge, max( 1, (int) $challenge['expiresAt'] - time() ) );
			}
			return $this->invalid_otp();
		}
		delete_transient( $challenge_key );
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
		}
		update_user_meta( $user_id, 'kadochi_phone', $phone );
		update_user_meta( $user_id, 'billing_phone', $national_phone );
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
		$display_name = sanitize_text_field( $user->display_name );
		if ( '' === $display_name ) {
			$display_name = trim( $first_name . ' ' . $last_name );
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
			'phone' => $phone,
			'roles' => array_values( $user->roles ),
		);
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
		if ( $this->local_auth_enabled() ) {
			if ( '+989121234567' !== $phone || '1234' !== $code ) {
				return $this->invalid_otp();
			}
		} else {
			$verified = $this->verify_stored_otp( $phone, $code );
			if ( is_wp_error( $verified ) ) {
				return $verified;
			}
		}
		$user_id = $this->resolve_customer( $phone );
		if ( is_wp_error( $user_id ) ) {
			return $user_id;
		}
		$customer = $this->customer_dto( $user_id );
		if ( ! $customer ) {
			return $this->auth_error( 'kadochi_customer_unavailable', __( 'The customer service is unavailable.', 'kadochi-core' ), 503 );
		}
		return rest_ensure_response( array( 'token' => $this->issue_jwt( $user_id, $phone ), 'expiresIn' => self::JWT_TTL_SECONDS, 'customer' => $customer ) );
	}

	public function health_response() {
		return rest_ensure_response( array( 'ok' => empty( $this->health ), 'checks' => $this->health ) );
	}

	public function customer() {
		$customer = $this->customer_dto( get_current_user_id() );
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
			array( 'id' => self::CHECKOUT_FIELD_OPERATION, 'label' => __( 'Kadochi checkout operation', 'kadochi-core' ), 'location' => 'order', 'required' => true, 'sanitize_callback' => 'sanitize_text_field' ),
		);
		foreach ( $fields as $field ) {
			woocommerce_register_additional_checkout_field( $field );
		}
	}

	/** Exposes only server-derived eligibility in each Store API cart item's extension data. */
	public function register_store_api_data() {
		if ( ! function_exists( 'woocommerce_store_api_register_endpoint_data' ) || ! class_exists( '\\Automattic\\WooCommerce\\StoreApi\\Schemas\\V1\\CartItemSchema' ) ) {
			return;
		}
		woocommerce_store_api_register_endpoint_data( array(
			'endpoint' => \Automattic\WooCommerce\StoreApi\Schemas\V1\CartItemSchema::IDENTIFIER,
			'namespace' => 'kadochi',
			'data_callback' => array( $this, 'cart_item_extension_data' ),
			'schema_callback' => array( $this, 'cart_item_extension_schema' ),
			'schema_type' => ARRAY_A,
		) );
	}

	public function cart_item_extension_data( $cart_item ) {
		return array( 'fastDelivery' => $this->cart_item_fast_delivery( $cart_item ) );
	}

	public function cart_item_extension_schema() {
		return array(
			'fastDelivery' => array(
				'description' => __( 'Whether the cart item is eligible for Kadochi same-day delivery.', 'kadochi-core' ),
				'type' => 'boolean',
				'readonly' => true,
			),
		);
	}

	private function fast_delivery_product( $product ) {
		if ( ! is_object( $product ) || ! method_exists( $product, 'get_id' ) ) {
			return false;
		}
		$product_id = method_exists( $product, 'get_parent_id' ) && $product->get_parent_id() ? $product->get_parent_id() : $product->get_id();
		// `fast-delivery` is canonical. The remaining values preserve legacy catalogue tags.
		$aliases = array( 'fast-delivery', 'fast_delivery', 'fastdelivery', 'same-day-delivery', 'same_day_delivery', 'express-delivery', 'express_delivery', 'express' );
		return has_term( $aliases, 'product_tag', $product_id );
	}

	private function cart_item_fast_delivery( $cart_item ) {
		return is_array( $cart_item ) && isset( $cart_item['data'] ) && $this->fast_delivery_product( $cart_item['data'] );
	}

	private function cart_fast_delivery() {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return false;
		}
		$items = WC()->cart->get_cart();
		if ( empty( $items ) ) {
			return false;
		}
		foreach ( $items as $item ) {
			if ( ! $this->cart_item_fast_delivery( $item ) ) {
				return false;
			}
		}
		return true;
	}

	/** The exact slots are recomputed for every Store API validation in Tehran time. */
	private function delivery_slots() {
		$timezone = new DateTimeZone( 'Asia/Tehran' );
		$now = new DateTimeImmutable( 'now', $timezone );
		$today = $now->setTime( 0, 0, 0 );
		$fast_delivery = $this->cart_fast_delivery();
		$day = $fast_delivery ? $today : $today->modify( '+1 day' );
		$windows = array( array( 10, 13 ), array( 13, 16 ), array( 16, 19 ) );
		$slots = array();
		while ( count( $slots ) < 9 ) {
			if ( '5' !== $day->format( 'N' ) ) { // Friday.
				$is_today = $day->format( 'Y-m-d' ) === $today->format( 'Y-m-d' );
				foreach ( $windows as $window ) {
					if ( count( $slots ) >= 9 ) {
						break;
					}
					// Do not advertise a slot once its delivery window has started.
					if ( $is_today && $window[0] <= (int) $now->format( 'G' ) ) {
						continue;
					}
					$date = $day->format( 'Y-m-d' );
					$slots[] = array( 'id' => $date . '-' . $window[0], 'date' => $date, 'startHour' => $window[0], 'endHour' => $window[1], 'label' => $date . '، ' . $window[0] . ' تا ' . $window[1] );
				}
			}
			$day = $day->modify( '+1 day' );
		}
		return $slots;
	}

	private function valid_delivery_slot( $value ) {
		if ( ! is_string( $value ) || ! preg_match( '/^\\d{4}-\\d{2}-\\d{2}-(10|13|16)$/', $value ) ) {
			return false;
		}
		foreach ( $this->delivery_slots() as $slot ) {
			if ( hash_equals( $slot['id'], $value ) ) {
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
		if ( self::CHECKOUT_FIELD_POSTCARD === $field_key && ( ! is_string( $field_value ) || $this->string_length( $field_value ) > 500 ) ) {
			$errors->add( 'kadochi_invalid_postcard', __( 'The postcard message is too long.', 'kadochi-core' ) );
		}
		if ( self::CHECKOUT_FIELD_OPERATION === $field_key && ( ! is_string( $field_value ) || ! preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i', $field_value ) ) ) {
			$errors->add( 'kadochi_invalid_operation', __( 'The checkout operation is invalid.', 'kadochi-core' ) );
		}
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
		$method = sanitize_key( (string) $request->get_param( 'payment_method' ) );
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
		$operation = (string) $order->get_meta( '_kadochi_checkout_operation', true );
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
		$frontend = getenv( 'KADOCHI_FRONTEND_URL' );
		$frontend = is_string( $frontend ) ? trim( $frontend ) : '';
		$parts = $frontend ? wp_parse_url( $frontend ) : false;
		// This is a trusted deployment setting, not an outbound request target.
		// wp_http_validate_url() rejects the documented localhost development URL.
		if ( ! is_array( $parts ) || empty( $parts['host'] ) || empty( $parts['scheme'] ) || ! in_array( strtolower( $parts['scheme'] ), array( 'http', 'https' ), true ) || isset( $parts['user'] ) || isset( $parts['pass'] ) ) {
			return $url;
		}
		$frontend = esc_url_raw( $frontend, array( 'http', 'https' ) );
		return add_query_arg( 'order', absint( $order->get_id() ), trailingslashit( $frontend ) . 'checkout/return' );
	}

	private function order_money( $order ) {
		$minor_unit = function_exists( 'wc_get_price_decimals' ) ? max( 0, (int) wc_get_price_decimals() ) : 0;
		$total = function_exists( 'wc_format_decimal' ) ? wc_format_decimal( $order->get_total(), $minor_unit ) : (string) $order->get_total();
		$parts = explode( '.', (string) $total, 2 );
		$integer = preg_replace( '/\\D/', '', $parts[0] );
		$fraction = isset( $parts[1] ) ? preg_replace( '/\\D/', '', $parts[1] ) : '';
		$amount = ltrim( ( $integer ?: '0' ) . str_pad( substr( $fraction, 0, $minor_unit ), $minor_unit, '0' ), '0' );
		return array( 'amount' => '' === $amount ? '0' : $amount, 'currencyCode' => sanitize_text_field( $order->get_currency() ), 'minorUnit' => $minor_unit );
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

	private function order_summary_dto( $order ) {
		$created = $order->get_date_created();
		return array(
			'id' => (int) $order->get_id(),
			'paid' => (bool) $order->is_paid(),
			'status' => sanitize_key( $order->get_status() ),
			'createdAt' => $created ? $created->date( 'c' ) : gmdate( 'c' ),
			'total' => $this->order_money( $order ),
			'recipient' => array( 'firstName' => sanitize_text_field( $order->get_shipping_first_name() ), 'lastName' => sanitize_text_field( $order->get_shipping_last_name() ) ),
			'deliverySlot' => ( $slot = $order->get_meta( '_wc_other/' . self::CHECKOUT_FIELD_DELIVERY_SLOT, true ) ) ? sanitize_text_field( $slot ) : null,
		);
	}

	public function order_summary( WP_REST_Request $request ) {
		$order = $this->owned_order( $request['id'] );
		return is_wp_error( $order ) ? $order : rest_ensure_response( $this->order_summary_dto( $order ) );
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

	private function published( $type ) {
		return get_posts( array( 'post_type' => $type, 'post_status' => 'publish', 'numberposts' => 50, 'orderby' => 'menu_order date', 'order' => 'ASC' ) );
	}

	public function homepage_content() {
		$banners = array_map( function ( $post ) { return array( 'id' => (int) $post->ID, 'title' => sanitize_text_field( $this->value( $post->ID, 'title' ) ?: $post->post_title ), 'subtitle' => sanitize_text_field( $this->value( $post->ID, 'subtitle' ) ), 'ctaText' => sanitize_text_field( $this->value( $post->ID, 'cta_text' ) ), 'ctaLink' => $this->safe_url( $this->value( $post->ID, 'cta_link' ) ), 'backgroundGradient' => $this->safe_gradient( $this->value( $post->ID, 'background_gradient' ) ), 'backgroundImage' => $this->image( $this->value( $post->ID, 'background_image' ) ) ); }, $this->published( 'banner' ) );
		$heroes = array_map( function ( $post ) { return array( 'id' => (int) $post->ID, 'title' => sanitize_text_field( $this->value( $post->ID, 'title' ) ?: $post->post_title ), 'ctaText' => sanitize_text_field( $this->value( $post->ID, 'cta_text' ) ), 'ctaLink' => $this->safe_url( $this->value( $post->ID, 'cta_link' ) ), 'backgroundImage' => $this->image( $this->value( $post->ID, 'background_image' ) ) ); }, $this->published( 'hero' ) );
		$sliders = array_map( function ( $post ) { return array( 'id' => (int) $post->ID, 'sliderTitle' => sanitize_text_field( $this->value( $post->ID, 'slider_title' ) ), 'sliderButtonText' => sanitize_text_field( $this->value( $post->ID, 'slider_button_text' ) ), 'sliderLink' => $this->safe_url( $this->value( $post->ID, 'slider_link' ) ), 'backgroundImage' => $this->image( $this->value( $post->ID, 'background_image' ) ) ); }, $this->published( 'slider' ) );
		return rest_ensure_response( compact( 'banners', 'heroes', 'sliders' ) );
	}

	private function valid_date( $date ) {
		if ( ! is_string( $date ) || ! preg_match( '/^\\d{4}-\\d{2}-\\d{2}$/', $date ) ) return false;
		$parsed = DateTime::createFromFormat( '!Y-m-d', $date );
		return $parsed && $parsed->format( 'Y-m-d' ) === $date;
	}

	private function owned_occasion( $id ) {
		$post = get_post( (int) $id );
		if ( ! $post || 'occasion' !== $post->post_type || (int) $post->post_author !== get_current_user_id() ) return new WP_Error( 'kadochi_occasion_not_found', __( 'Occasion not found.', 'kadochi-core' ), array( 'status' => 404 ) );
		return $post;
	}

	private function occasion_dto( $post ) {
		$title = $this->value( $post->ID, 'title' );
		return array( 'id' => (int) $post->ID, 'title' => sanitize_text_field( $title ?: $post->post_title ), 'occasionDate' => sanitize_text_field( (string) $this->value( $post->ID, 'occasion_date' ) ), 'version' => get_post_modified_time( 'c', true, $post ) );
	}

	private function params( WP_REST_Request $request ) { $params = $request->get_json_params(); return is_array( $params ) ? $params : array(); }

	public function list_occasions( WP_REST_Request $request ) {
		$page = max( 1, min( 100, (int) $request->get_param( 'page' ) ) );
		$per_page = max( 1, min( 50, (int) $request->get_param( 'per_page' ) ?: 20 ) );
		$query = new WP_Query( array( 'post_type' => 'occasion', 'post_status' => 'publish', 'author' => get_current_user_id(), 'paged' => $page, 'posts_per_page' => $per_page, 'orderby' => 'date', 'order' => 'DESC', 'no_found_rows' => false ) );
		return rest_ensure_response( array( 'items' => array_map( array( $this, 'occasion_dto' ), $query->posts ), 'page' => $page, 'perPage' => $per_page, 'total' => (int) $query->found_posts, 'totalPages' => (int) $query->max_num_pages ) );
	}

	public function get_occasion( WP_REST_Request $request ) { $post = $this->owned_occasion( $request['id'] ); return is_wp_error( $post ) ? $post : rest_ensure_response( $this->occasion_dto( $post ) ); }

	public function create_occasion( WP_REST_Request $request ) {
		$input = $this->params( $request ); $title = isset( $input['title'] ) ? sanitize_text_field( $input['title'] ) : ''; $date = isset( $input['occasionDate'] ) ? $input['occasionDate'] : '';
		if ( '' === $title || strlen( $title ) > 120 || ! $this->valid_date( $date ) ) return new WP_Error( 'kadochi_invalid_occasion', __( 'A title and a valid occasion date are required.', 'kadochi-core' ), array( 'status' => 400 ) );
		$id = wp_insert_post( array( 'post_type' => 'occasion', 'post_status' => 'publish', 'post_title' => $title, 'post_author' => get_current_user_id() ), true );
		if ( is_wp_error( $id ) ) return $id;
		update_post_meta( $id, 'title', $title ); update_post_meta( $id, 'occasion_date', $date ); update_post_meta( $id, 'user', get_current_user_id() );
		return new WP_REST_Response( $this->occasion_dto( get_post( $id ) ), 201 );
	}

	private function check_version( $post, $input ) { return isset( $input['version'] ) && hash_equals( get_post_modified_time( 'c', true, $post ), (string) $input['version'] ); }
	public function update_occasion( WP_REST_Request $request ) {
		$post = $this->owned_occasion( $request['id'] ); if ( is_wp_error( $post ) ) return $post; $input = $this->params( $request );
		if ( ! $this->check_version( $post, $input ) ) return new WP_Error( 'kadochi_occasion_conflict', __( 'The occasion has changed. Refresh and try again.', 'kadochi-core' ), array( 'status' => 409 ) );
		if ( isset( $input['title'] ) ) { $title = sanitize_text_field( $input['title'] ); if ( '' === $title || strlen( $title ) > 120 ) return new WP_Error( 'kadochi_invalid_occasion', __( 'A valid title is required.', 'kadochi-core' ), array( 'status' => 400 ) ); wp_update_post( array( 'ID' => $post->ID, 'post_title' => $title ) ); update_post_meta( $post->ID, 'title', $title ); }
		if ( isset( $input['occasionDate'] ) ) { if ( ! $this->valid_date( $input['occasionDate'] ) ) return new WP_Error( 'kadochi_invalid_occasion', __( 'A valid occasion date is required.', 'kadochi-core' ), array( 'status' => 400 ) ); update_post_meta( $post->ID, 'occasion_date', $input['occasionDate'] ); }
		update_post_meta( $post->ID, 'user', get_current_user_id() );
		return rest_ensure_response( $this->occasion_dto( get_post( $post->ID ) ) );
	}

	public function delete_occasion( WP_REST_Request $request ) {
		$post = $this->owned_occasion( $request['id'] ); if ( is_wp_error( $post ) ) return $post; $input = $this->params( $request );
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
