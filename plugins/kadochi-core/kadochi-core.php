<?php
/**
 * Plugin Name: Kadochi Core
 * Description: Durable headless content contracts and protected occasion records for Kadochi.
 * Version: 0.1.0
 * Requires at least: 6.6
 * Requires PHP: 7.4
 * Text Domain: kadochi-core
 */

defined( 'ABSPATH' ) || exit;

final class Kadochi_Core {
	const REST_NAMESPACE = 'kadochi/v1';
	const SCF_MIN_VERSION = '6.0.0';

	/** @var array<string, string> */
	private $health = array();

	public function boot() {
		add_action( 'init', array( $this, 'register_post_types' ), 5 );
		add_action( 'init', array( $this, 'harden_existing_occasion_type' ), 99 );
		add_action( 'acf/init', array( $this, 'register_scf_fields' ) );
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'rest_endpoints', array( $this, 'remove_default_occasion_routes' ) );
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
		$types = array( 'slider' => array( 'slider', 'sliders' ), 'banner' => array( 'banner', 'banners' ), 'gifts' => array( 'gift', 'gifts' ), 'hero' => array( 'hero', 'heroes' ), 'occasion' => array( 'occasion', 'occasions' ) );
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
		$this->register_post_type( 'slider', 'Sliders', 'Slider', array( 'title', 'editor', 'thumbnail' ), true );
		$this->register_post_type( 'banner', 'Banners', 'Banner', array( 'title', 'editor', 'thumbnail' ), true );
		$this->register_post_type( 'gifts', 'Gifts', 'Gift', array( 'title', 'editor', 'thumbnail' ), true );
		$this->register_post_type( 'hero', 'Heroes', 'Hero', array( 'title', 'editor', 'thumbnail' ), true );
		$this->register_post_type( 'occasion', 'Occasions', 'Occasion', array( 'title', 'editor', 'thumbnail', 'author' ), false );
	}

	private function register_post_type( $slug, $plural_label, $singular_label, $supports, $legacy_public ) {
		if ( post_type_exists( $slug ) ) {
			return;
		}
		$singular = 'gifts' === $slug ? 'gift' : $slug;
		$plural   = $slug;
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
			array( 'key' => 'group_686d3471a96bc', 'title' => 'Gifts', 'fields' => array( $this->field( 'field_686d347151270', 'Image', 'image', 'image', $image_url ), $this->field( 'field_686d348351271', 'Price', 'price', 'number' ), $this->field( 'field_686d349151272', 'Title', 'title', 'text' ), $this->field( 'field_686ed667a9d8a', 'Description', 'description', 'textarea' ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'gifts' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
			array( 'key' => 'group_68ff3b5e2403e', 'title' => 'Hero', 'fields' => array( $this->field( 'field_68ff3b5e2bc20', 'Title', 'title', 'text' ), $this->field( 'field_68ff3b5e2bccb', 'CTA Text', 'cta_text', 'text' ), $this->field( 'field_68ff3b5e2bd1c', 'CTA Link', 'cta_link', 'url' ), $this->field( 'field_68ff3b5e2bdb4', 'Background Image', 'background_image', 'image', $image_url ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'hero' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
			array( 'key' => 'group_684ada15be887', 'title' => 'Image Slider', 'fields' => array( $this->field( 'field_684ada1598922', 'Background Image', 'background_image', 'image', array( 'return_format' => 'array', 'library' => 'all', 'preview_size' => 'medium' ) ), $this->field( 'field_684ada7298923', 'Slider Title', 'slider_title', 'text' ), $this->field( 'field_684adaa998924', 'Slider Button Text', 'slider_button_text', 'text' ), $this->field( 'field_684adabd98925', 'Slider Link', 'slider_link', 'link', array( 'return_format' => 'url' ) ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'slider' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
			array( 'key' => 'group_68690d0e375df', 'title' => 'Occasion', 'fields' => array( $this->field( 'field_68690d0e8d04d', 'title', 'title', 'text' ), $this->field( 'field_68690d148d04e', 'occasion date', 'occasion_date', 'date_picker', array( 'display_format' => 'Y-m-d', 'return_format' => 'Y-m-d', 'first_day' => 6, 'default_to_current_date' => 0 ) ), $this->field( 'field_699c24f932f43', 'user', 'user', 'user', array( 'return_format' => 'id', 'multiple' => 0, 'allow_null' => 0 ) ) ), 'location' => array( array( array( 'param' => 'post_type', 'operator' => '==', 'value' => 'occasion' ) ) ), 'active' => true, 'show_in_rest' => 0 ),
		);
	}

	public function register_routes() {
		register_rest_route( self::REST_NAMESPACE, '/health', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'health_response' ), 'permission_callback' => function () { return current_user_can( 'manage_options' ); } ) );
		register_rest_route( self::REST_NAMESPACE, '/content/home', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'homepage_content' ), 'permission_callback' => '__return_true' ) );
		register_rest_route( self::REST_NAMESPACE, '/customer', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( $this, 'customer' ), 'permission_callback' => array( $this, 'authenticated' ) ) );
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
		return is_user_logged_in() ? true : new WP_Error( 'kadochi_unauthenticated', __( 'Authentication is required.', 'kadochi-core' ), array( 'status' => 401 ) );
	}

	public function health_response() {
		return rest_ensure_response( array( 'ok' => empty( $this->health ), 'checks' => $this->health ) );
	}

	public function customer() {
		$user = wp_get_current_user();
		return rest_ensure_response( array( 'id' => (int) $user->ID, 'email' => sanitize_email( $user->user_email ), 'displayName' => sanitize_text_field( $user->display_name ), 'roles' => array_values( $user->roles ) ) );
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
		$gifts = array_map( function ( $post ) { $price = $this->value( $post->ID, 'price' ); return array( 'id' => (int) $post->ID, 'title' => sanitize_text_field( $this->value( $post->ID, 'title' ) ?: $post->post_title ), 'description' => wp_kses_post( (string) $this->value( $post->ID, 'description' ) ), 'image' => $this->image( $this->value( $post->ID, 'image' ) ), 'price' => '' === $price || null === $price ? null : sanitize_text_field( (string) $price ) ); }, $this->published( 'gifts' ) );
		return rest_ensure_response( compact( 'banners', 'heroes', 'sliders', 'gifts' ) );
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
