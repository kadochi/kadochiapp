<?php
/** Secure support conversations, REST endpoints, and staff console. */

defined( 'ABSPATH' ) || exit;

final class Kadochi_Support {
	const DB_VERSION = '1';
	const CAP_VERSION = '1';
	const CAPABILITY = 'manage_kadochi_support';
	const GUEST_TTL = 15552000; // 180 days.
	const MAX_MESSAGE_LENGTH = 2000;
	const INITIAL_SUPPORT_MESSAGE = 'سلام 👋 برای انتخاب محصول، ثبت سفارش یا هر سوالی که دارید در خدمتیم.';

	public function boot() {
		self::maybe_install();
		self::maybe_grant_capabilities();
		add_action( 'init', array( $this, 'register_post_types' ), 6 );
		add_action( 'rest_api_init', array( $this, 'register_routes' ) );
		add_filter( 'rest_post_dispatch', array( $this, 'add_retry_after_header' ), 10, 3 );
		add_action( 'admin_menu', array( $this, 'add_admin_page' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_admin_assets' ) );
	}

	public static function activate() {
		self::install_tables();
		self::grant_capabilities();
		update_option( 'kadochi_support_capabilities_version', self::CAP_VERSION, false );
	}

	private static function conversation_table() {
		global $wpdb;
		return $wpdb->prefix . 'kadochi_support_conversations';
	}

	private static function message_table() {
		global $wpdb;
		return $wpdb->prefix . 'kadochi_support_messages';
	}

	private static function install_tables() {
		global $wpdb;
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$collate = $wpdb->get_charset_collate();
		$conversations = self::conversation_table();
		$messages = self::message_table();
		dbDelta( "CREATE TABLE {$conversations} (
			conversation_post_id bigint(20) unsigned NOT NULL,
			public_id char(36) NOT NULL,
			owner_type varchar(10) NOT NULL,
			customer_id bigint(20) unsigned NULL,
			guest_id char(36) NULL,
			display_name varchar(100) NOT NULL,
			email varchar(190) NULL,
			phone varchar(20) NULL,
			assigned_admin_id bigint(20) unsigned NULL,
			status varchar(10) NOT NULL DEFAULT 'open',
			last_message_at_gmt datetime NULL,
			customer_unread_count int unsigned NOT NULL DEFAULT 0,
			admin_unread_count int unsigned NOT NULL DEFAULT 0,
			revision bigint(20) unsigned NOT NULL DEFAULT 1,
			created_at_gmt datetime NOT NULL,
			updated_at_gmt datetime NOT NULL,
			merged_into_public_id char(36) NULL,
			PRIMARY KEY  (conversation_post_id),
			UNIQUE KEY public_id (public_id),
			KEY customer_queue (customer_id,status,last_message_at_gmt),
			KEY guest_queue (guest_id,status,last_message_at_gmt),
			KEY support_queue (status,admin_unread_count,last_message_at_gmt),
			KEY assignee_queue (assigned_admin_id,status,last_message_at_gmt),
			KEY email_search (email),
			KEY phone_search (phone),
			KEY display_name_search (display_name)
		) {$collate};" );
		dbDelta( "CREATE TABLE {$messages} (
			message_post_id bigint(20) unsigned NOT NULL,
			public_id char(36) NOT NULL,
			conversation_post_id bigint(20) unsigned NOT NULL,
			sender_role varchar(20) NOT NULL,
			sender_user_id bigint(20) unsigned NULL,
			operation_id char(36) NOT NULL,
			read_at_gmt datetime NULL,
			created_at_gmt datetime NOT NULL,
			PRIMARY KEY  (message_post_id),
			UNIQUE KEY public_id (public_id),
			UNIQUE KEY conversation_operation (conversation_post_id,sender_role,operation_id),
			KEY conversation_page (conversation_post_id,created_at_gmt,message_post_id),
			KEY conversation_unread (conversation_post_id,sender_role,read_at_gmt)
		) {$collate};" );
		update_option( 'kadochi_support_db_version', self::DB_VERSION, false );
	}

	private static function maybe_install() {
		if ( self::DB_VERSION !== get_option( 'kadochi_support_db_version' ) ) {
			self::install_tables();
		}
	}

	private static function grant_capabilities() {
		foreach ( array( 'administrator', 'shop_manager' ) as $role_name ) {
			$role = get_role( $role_name );
			if ( $role ) {
				$role->add_cap( self::CAPABILITY );
			}
		}
	}

	private static function maybe_grant_capabilities() {
		if ( self::CAP_VERSION !== get_option( 'kadochi_support_capabilities_version' ) ) {
			self::grant_capabilities();
			update_option( 'kadochi_support_capabilities_version', self::CAP_VERSION, false );
		}
	}

	public function register_post_types() {
		$common = array(
			'public' => false, 'publicly_queryable' => false, 'show_ui' => false,
			'show_in_menu' => false, 'show_in_rest' => false, 'exclude_from_search' => true,
			'has_archive' => false, 'rewrite' => false, 'query_var' => false,
			'supports' => array(), 'map_meta_cap' => true,
		);
		register_post_type( 'support_conversation', array_merge( $common, array( 'labels' => array( 'name' => __( 'Support conversations', 'kadochi-core' ) ) ) ) );
		register_post_type( 'support_message', array_merge( $common, array( 'labels' => array( 'name' => __( 'Support messages', 'kadochi-core' ) ) ) ) );
	}

	public function register_routes() {
		$public = array( $this, 'participant_permission' );
		$admin = array( $this, 'admin_permission' );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/conversations/current', array( 'methods' => 'GET', 'callback' => array( $this, 'current_conversation' ), 'permission_callback' => $public ) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/conversations', array( 'methods' => 'POST', 'callback' => array( $this, 'create_or_resume' ), 'permission_callback' => $public ) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/claim', array( 'methods' => 'POST', 'callback' => array( $this, 'claim_guest_conversations' ), 'permission_callback' => array( $this, 'authenticated_permission' ) ) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/conversations/(?P<id>[a-f0-9-]{36})', array( 'methods' => 'GET', 'callback' => array( $this, 'get_conversation' ), 'permission_callback' => $public ) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/conversations/(?P<id>[a-f0-9-]{36})/messages', array(
			array( 'methods' => 'GET', 'callback' => array( $this, 'list_messages' ), 'permission_callback' => $public ),
			array( 'methods' => 'POST', 'callback' => array( $this, 'send_customer_message' ), 'permission_callback' => $public ),
		) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/conversations/(?P<id>[a-f0-9-]{36})/read', array( 'methods' => 'POST', 'callback' => array( $this, 'mark_customer_read' ), 'permission_callback' => $public ) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/admin/conversations', array( 'methods' => 'GET', 'callback' => array( $this, 'admin_list_conversations' ), 'permission_callback' => $admin ) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/admin/conversations/(?P<id>[a-f0-9-]{36})', array(
			array( 'methods' => 'GET', 'callback' => array( $this, 'admin_get_conversation' ), 'permission_callback' => $admin ),
			array( 'methods' => 'PATCH', 'callback' => array( $this, 'admin_update_conversation' ), 'permission_callback' => $admin ),
		) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/admin/conversations/(?P<id>[a-f0-9-]{36})/messages', array(
			array( 'methods' => 'GET', 'callback' => array( $this, 'admin_list_messages' ), 'permission_callback' => $admin ),
			array( 'methods' => 'POST', 'callback' => array( $this, 'send_admin_message' ), 'permission_callback' => $admin ),
		) );
		register_rest_route( Kadochi_Core::REST_NAMESPACE, '/support/admin/conversations/(?P<id>[a-f0-9-]{36})/read', array( 'methods' => 'POST', 'callback' => array( $this, 'mark_admin_read' ), 'permission_callback' => $admin ) );
	}

	public function participant_permission() { return true; }
	public function authenticated_permission() { return get_current_user_id() ? true : new WP_Error( 'kadochi_unauthenticated', __( 'Authentication is required.', 'kadochi-core' ), array( 'status' => 401 ) ); }
	public function admin_permission() { return current_user_can( self::CAPABILITY ) ? true : new WP_Error( 'kadochi_forbidden', __( 'You cannot manage support conversations.', 'kadochi-core' ), array( 'status' => 403 ) ); }

	private function params( $request ) {
		$params = $request->get_json_params();
		return is_array( $params ) ? $params : array();
	}

	private function only_keys( $input, $allowed ) { return empty( array_diff( array_keys( $input ), $allowed ) ); }

	public function add_retry_after_header( $response ) {
		if ( ! $response instanceof WP_REST_Response || 429 !== $response->get_status() ) return $response;
		$data = $response->get_data();
		$retry_after = is_array( $data ) && isset( $data['data']['retryAfter'] ) ? absint( $data['data']['retryAfter'] ) : 0;
		if ( $retry_after ) $response->header( 'Retry-After', (string) $retry_after );
		return $response;
	}

	private function error( $code, $message, $status, $extra = array() ) {
		return new WP_Error( $code, $message, array_merge( array( 'status' => $status ), $extra ) );
	}

	private function valid_uuid( $value ) {
		return is_string( $value ) && 1 === preg_match( '/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i', $value );
	}

	private function text_length( $value ) { return function_exists( 'mb_strlen' ) ? mb_strlen( $value, 'UTF-8' ) : strlen( $value ); }
	private function now() { return current_time( 'mysql', true ); }
	private function iso_time( $value ) { $time = $value ? strtotime( $value . ' UTC' ) : false; return $time ? gmdate( 'Y-m-d\TH:i:s\Z', $time ) : null; }
	private function b64e( $value ) { return rtrim( strtr( base64_encode( $value ), '+/', '-_' ), '=' ); }
	private function b64d( $value ) { return is_string( $value ) ? base64_decode( strtr( $value, '-_', '+/' ) . str_repeat( '=', ( 4 - strlen( $value ) % 4 ) % 4 ), true ) : false; }
	private function token_key() { return hash_hmac( 'sha256', 'kadochi-support-guest-v1', wp_salt( 'auth' ) ); }

	private function issue_guest_token( $guest_id ) {
		$payload = $this->b64e( wp_json_encode( array( 'gid' => $guest_id, 'iat' => time(), 'exp' => time() + self::GUEST_TTL, 'aud' => 'kadochi-support' ) ) );
		return $payload . '.' . $this->b64e( hash_hmac( 'sha256', $payload, $this->token_key(), true ) );
	}

	private function guest_id() {
		$token = trim( (string) ( isset( $_SERVER['HTTP_X_KADOCHI_SUPPORT_GUEST'] ) ? $_SERVER['HTTP_X_KADOCHI_SUPPORT_GUEST'] : '' ) );
		$parts = explode( '.', $token );
		if ( 2 !== count( $parts ) ) return null;
		$signature = $this->b64d( $parts[1] );
		if ( false === $signature || ! hash_equals( hash_hmac( 'sha256', $parts[0], $this->token_key(), true ), $signature ) ) return null;
		$payload = json_decode( $this->b64d( $parts[0] ), true );
		return is_array( $payload ) && isset( $payload['gid'], $payload['exp'], $payload['aud'] ) && 'kadochi-support' === $payload['aud'] && $this->valid_uuid( $payload['gid'] ) && (int) $payload['exp'] > time() ? strtolower( $payload['gid'] ) : null;
	}

	private function owner() {
		$user_id = get_current_user_id();
		if ( $user_id ) return array( 'type' => 'customer', 'customer_id' => $user_id, 'guest_id' => null );
		$guest_id = $this->guest_id();
		return $guest_id ? array( 'type' => 'guest', 'customer_id' => null, 'guest_id' => $guest_id ) : null;
	}

	private function customer_identity() {
		$user = wp_get_current_user();
		$phone = $this->canonical_phone( (string) get_user_meta( $user->ID, 'billing_phone', true ) );
		return array(
			'display_name' => sanitize_text_field( $user->display_name ?: $user->user_login ),
			'email' => sanitize_email( $user->user_email ),
			'phone' => is_string( $phone ) ? $phone : null,
		);
	}

	private function canonical_phone( $value ) {
		if ( null === $value || '' === trim( (string) $value ) ) return null;
		$value = strtr( trim( (string) $value ), array( '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9','٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9' ) );
		$value = preg_replace( '/[\s\-()]+/', '', $value );
		if ( preg_match( '/^09\d{9}$/', $value ) ) return '+98' . substr( $value, 1 );
		if ( preg_match( '/^00989\d{9}$/', $value ) ) return '+' . substr( $value, 2 );
		return preg_match( '/^\+989\d{9}$/', $value ) ? $value : false;
	}

	private function row_by_public_id( $public_id ) {
		global $wpdb;
		return $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::conversation_table() . ' WHERE public_id = %s', strtolower( $public_id ) ) );
	}

	private function visible_row( $public_id, $admin = false ) {
		$row = $this->valid_uuid( $public_id ) ? $this->row_by_public_id( $public_id ) : null;
		if ( ! $row ) return $this->error( 'kadochi_support_not_found', __( 'Conversation not found.', 'kadochi-core' ), 404 );
		if ( $admin ) return $row;
		$owner = $this->owner();
		$owned = $owner && ( ( 'customer' === $owner['type'] && 'customer' === $row->owner_type && (int) $row->customer_id === $owner['customer_id'] ) || ( 'guest' === $owner['type'] && 'guest' === $row->owner_type && hash_equals( (string) $row->guest_id, $owner['guest_id'] ) ) );
		return $owned ? $row : $this->error( 'kadochi_support_not_found', __( 'Conversation not found.', 'kadochi-core' ), 404 );
	}

	private function version( $row ) { return $this->b64e( hash_hmac( 'sha256', $row->public_id . ':' . $row->revision, $this->token_key(), true ) ); }

	private function conversation_dto( $row, $admin = false ) {
		$assigned = $row->assigned_admin_id ? get_user_by( 'id', (int) $row->assigned_admin_id ) : null;
		$dto = array(
			'id' => $row->public_id, 'status' => $row->status,
			'displayName' => $row->display_name,
			'assignedAgent' => $assigned ? sanitize_text_field( $assigned->display_name ) : null,
			'lastMessageAt' => $this->iso_time( $row->last_message_at_gmt ),
			'unreadCount' => $admin ? (int) $row->admin_unread_count : (int) $row->customer_unread_count,
			'version' => $this->version( $row ),
		);
		if ( $admin ) {
			$dto['ownerType'] = $row->owner_type;
			$dto['email'] = $row->email ?: null;
			$dto['phone'] = $row->phone ?: null;
			$dto['assignedAdminId'] = $row->assigned_admin_id ? (int) $row->assigned_admin_id : null;
			$dto['createdAt'] = $this->iso_time( $row->created_at_gmt );
		}
		return $dto;
	}

	private function sync_conversation_meta( $row ) {
		if ( ! $row ) return;
		$values = array(
			'_kadochi_support_public_id' => $row->public_id,
			'_kadochi_support_owner_type' => $row->owner_type,
			'_kadochi_support_customer_id' => $row->customer_id,
			'_kadochi_support_guest_id' => $row->guest_id,
			'_kadochi_support_display_name' => $row->display_name,
			'_kadochi_support_email' => $row->email,
			'_kadochi_support_phone' => $row->phone,
			'_kadochi_support_assigned_admin_id' => $row->assigned_admin_id,
			'_kadochi_support_status' => $row->status,
			'_kadochi_support_last_message_at_gmt' => $row->last_message_at_gmt,
			'_kadochi_support_customer_unread_count' => (int) $row->customer_unread_count,
			'_kadochi_support_admin_unread_count' => (int) $row->admin_unread_count,
			'_kadochi_support_revision' => (int) $row->revision,
			'_kadochi_support_merged_into_public_id' => $row->merged_into_public_id,
		);
		foreach ( $values as $key => $value ) update_post_meta( (int) $row->conversation_post_id, $key, null === $value ? '' : $value );
	}

	private function current_row( $owner ) {
		global $wpdb;
		if ( ! $owner ) return null;
		$where = 'customer' === $owner['type'] ? $wpdb->prepare( 'owner_type = %s AND customer_id = %d', 'customer', $owner['customer_id'] ) : $wpdb->prepare( 'owner_type = %s AND guest_id = %s', 'guest', $owner['guest_id'] );
		return $wpdb->get_row( 'SELECT * FROM ' . self::conversation_table() . " WHERE {$where} AND merged_into_public_id IS NULL ORDER BY (status <> 'closed') DESC, COALESCE(last_message_at_gmt,created_at_gmt) DESC LIMIT 1" );
	}

	public function current_conversation() {
		$row = $this->current_row( $this->owner() );
		return rest_ensure_response( array( 'conversation' => $row ? $this->conversation_dto( $row ) : null ) );
	}

	private function rate_limit( $scope, $identity, $limit, $seconds ) {
		global $wpdb;
		$key = 'kadochi_support_rate_' . hash( 'sha256', $scope . ':' . $identity );
		$lock = 'kadochi_support_' . substr( hash( 'sha256', $key ), 0, 45 );
		if ( 1 !== (int) $wpdb->get_var( $wpdb->prepare( 'SELECT GET_LOCK(%s, 1)', $lock ) ) ) return $this->error( 'kadochi_support_busy', __( 'Support is busy. Try again.', 'kadochi-core' ), 503 );
		try {
			$state = get_transient( $key );
			$now = time();
			if ( ! is_array( $state ) || empty( $state['expires'] ) || $state['expires'] <= $now ) $state = array( 'count' => 0, 'expires' => $now + $seconds );
			if ( (int) $state['count'] >= $limit ) return $this->error( 'kadochi_support_rate_limited', __( 'Too many support requests. Try again later.', 'kadochi-core' ), 429, array( 'retryAfter' => max( 1, $state['expires'] - $now ) ) );
			$state['count']++;
			if ( ! set_transient( $key, $state, max( 1, $state['expires'] - $now ) ) ) return $this->error( 'kadochi_support_storage', __( 'Support is temporarily unavailable.', 'kadochi-core' ), 503 );
			return true;
		} finally {
			$wpdb->get_var( $wpdb->prepare( 'SELECT RELEASE_LOCK(%s)', $lock ) );
		}
	}

	public function create_or_resume( $request ) {
		global $wpdb;
		$input = $this->params( $request );
		if ( ! $this->only_keys( $input, array( 'displayName', 'phone', 'startNew' ) ) || ( isset( $input['startNew'] ) && ! is_bool( $input['startNew'] ) ) ) return $this->error( 'kadochi_support_validation', __( 'The conversation request is invalid.', 'kadochi-core' ), 400 );
		$owner = $this->owner();
		$current = $this->current_row( $owner );
		$start_new = isset( $input['startNew'] ) && true === $input['startNew'];
		if ( $current && 'closed' !== $current->status ) return rest_ensure_response( array( 'conversation' => $this->conversation_dto( $current ) ) );
		if ( $current && ! $start_new ) return rest_ensure_response( array( 'conversation' => $this->conversation_dto( $current ) ) );
		$issued_token = null;
		if ( ! $owner ) {
			$global_rate = $this->rate_limit( 'create-global', 'all-guests', 1000, HOUR_IN_SECONDS );
			if ( is_wp_error( $global_rate ) ) return $global_rate;
			$name = isset( $input['displayName'] ) && is_string( $input['displayName'] ) ? sanitize_text_field( trim( $input['displayName'] ) ) : '';
			$phone = $this->canonical_phone( isset( $input['phone'] ) ? $input['phone'] : null );
			if ( $this->text_length( $name ) < 2 || $this->text_length( $name ) > 100 || false === $phone ) return $this->error( 'kadochi_support_validation', __( 'Enter a valid name and optional Iranian phone number.', 'kadochi-core' ), 400 );
			$owner = array( 'type' => 'guest', 'customer_id' => null, 'guest_id' => wp_generate_uuid4() );
			$identity = array( 'display_name' => $name, 'email' => null, 'phone' => $phone );
			$issued_token = $this->issue_guest_token( $owner['guest_id'] );
		} elseif ( 'customer' === $owner['type'] ) {
			$identity = $this->customer_identity();
		} else {
			$identity = $current ? array( 'display_name' => $current->display_name, 'email' => $current->email, 'phone' => $current->phone ) : null;
			if ( ! $identity ) return $this->error( 'kadochi_support_validation', __( 'Guest details are required.', 'kadochi-core' ), 400 );
		}
		$rate = $this->rate_limit( 'create', 'customer' === $owner['type'] ? 'u' . $owner['customer_id'] : 'g' . $owner['guest_id'], 5, HOUR_IN_SECONDS );
		if ( is_wp_error( $rate ) ) return $rate;
		$public_id = wp_generate_uuid4();
		$post_id = wp_insert_post( array( 'post_type' => 'support_conversation', 'post_status' => 'private', 'post_title' => 'Support ' . $public_id, 'post_name' => $public_id ), true );
		if ( is_wp_error( $post_id ) ) return $post_id;
		$now = $this->now();
		$inserted = $wpdb->insert( self::conversation_table(), array(
			'conversation_post_id'=>$post_id, 'public_id'=>$public_id, 'owner_type'=>$owner['type'], 'customer_id'=>$owner['customer_id'], 'guest_id'=>$owner['guest_id'],
			'display_name'=>$identity['display_name'], 'email'=>$identity['email'], 'phone'=>$identity['phone'], 'status'=>'open', 'created_at_gmt'=>$now, 'updated_at_gmt'=>$now,
		), array( '%d','%s','%s','%d','%s','%s','%s','%s','%s','%s','%s' ) );
		if ( false === $inserted ) { wp_delete_post( $post_id, true ); return $this->error( 'kadochi_support_storage', __( 'The conversation could not be created.', 'kadochi-core' ), 500 ); }
		$row = $this->row_by_public_id( $public_id );
		$this->sync_conversation_meta( $row );
		$initial_message = $this->insert_initial_support_message( $row );
		if ( is_wp_error( $initial_message ) ) {
			$wpdb->delete( self::conversation_table(), array( 'conversation_post_id'=>$post_id ), array( '%d' ) );
			wp_delete_post( $post_id, true );
			return $initial_message;
		}
		$row = $this->row_by_public_id( $public_id );
		$response = new WP_REST_Response( array( 'conversation' => $this->conversation_dto( $row ) ), 201 );
		if ( $issued_token ) $response->header( 'X-Kadochi-Support-Guest', $issued_token );
		return $response;
	}

	public function get_conversation( $request ) {
		$row = $this->visible_row( $request['id'] );
		return is_wp_error( $row ) ? $row : rest_ensure_response( array( 'conversation' => $this->conversation_dto( $row ) ) );
	}

	private function message_dto( $row ) {
		$post = get_post( (int) $row->message_post_id );
		return array( 'id'=>$row->public_id, 'senderRole'=>$row->sender_role, 'body'=>$post ? (string) $post->post_content : '', 'createdAt'=>$this->iso_time( $row->created_at_gmt ), 'readAt'=>$this->iso_time( $row->read_at_gmt ) );
	}

	private function messages_response( $conversation, $request ) {
		global $wpdb;
		$per_page = max( 1, min( 50, (int) $request->get_param( 'per_page' ) ?: 30 ) );
		$before = $request->get_param( 'before' );
		$after = $request->get_param( 'after' );
		if ( $before && $after ) return $this->error( 'kadochi_support_validation', __( 'Choose one pagination direction.', 'kadochi-core' ), 400 );
		$boundary = null;
		if ( $before || $after ) $boundary = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::message_table() . ' WHERE public_id = %s AND conversation_post_id = %d', strtolower( (string) ( $before ?: $after ) ), $conversation->conversation_post_id ) );
		if ( ( $before || $after ) && ! $boundary ) return $this->error( 'kadochi_support_validation', __( 'The message cursor is invalid.', 'kadochi-core' ), 400 );
		$where = $wpdb->prepare( 'conversation_post_id = %d', $conversation->conversation_post_id );
		$order = 'DESC';
		if ( $boundary && $before ) $where .= $wpdb->prepare( ' AND (created_at_gmt < %s OR (created_at_gmt = %s AND message_post_id < %d))', $boundary->created_at_gmt, $boundary->created_at_gmt, $boundary->message_post_id );
		if ( $boundary && $after ) { $where .= $wpdb->prepare( ' AND (created_at_gmt > %s OR (created_at_gmt = %s AND message_post_id > %d))', $boundary->created_at_gmt, $boundary->created_at_gmt, $boundary->message_post_id ); $order = 'ASC'; }
		$rows = $wpdb->get_results( "SELECT * FROM " . self::message_table() . " WHERE {$where} ORDER BY created_at_gmt {$order}, message_post_id {$order} LIMIT " . ( $per_page + 1 ) );
		$has_more = count( $rows ) > $per_page;
		$rows = array_slice( $rows, 0, $per_page );
		if ( 'DESC' === $order ) $rows = array_reverse( $rows );
		return array( 'items'=>array_map( array( $this, 'message_dto' ), $rows ), 'hasMore'=>$has_more, 'oldestCursor'=>$rows ? $rows[0]->public_id : null, 'newestCursor'=>$rows ? $rows[count($rows)-1]->public_id : null );
	}

	public function list_messages( $request ) { $row = $this->visible_row( $request['id'] ); if ( is_wp_error( $row ) ) return $row; $messages = $this->messages_response( $row, $request ); return is_wp_error( $messages ) ? $messages : rest_ensure_response( $messages ); }

	private function insert_message( $conversation, $role, $user_id, $input, $automated = false ) {
		global $wpdb;
		if ( ! $this->only_keys( $input, array( 'body', 'operationId' ) ) ) return $this->error( 'kadochi_support_validation', __( 'The message request is invalid.', 'kadochi-core' ), 400 );
		$body = isset( $input['body'] ) && is_string( $input['body'] ) ? sanitize_textarea_field( trim( $input['body'] ) ) : '';
		$operation = isset( $input['operationId'] ) ? strtolower( (string) $input['operationId'] ) : '';
		if ( '' === $body || $this->text_length( $body ) > self::MAX_MESSAGE_LENGTH || ! $this->valid_uuid( $operation ) ) return $this->error( 'kadochi_support_validation', __( 'Enter a valid message.', 'kadochi-core' ), 400 );
		$existing = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::message_table() . ' WHERE conversation_post_id = %d AND sender_role = %s AND operation_id = %s', $conversation->conversation_post_id, $role, $operation ) );
		if ( $existing ) return rest_ensure_response( $this->message_dto( $existing ) );
		if ( ! $automated ) {
			$rate = $this->rate_limit( 'message', $role . ':' . ( $user_id ?: $conversation->guest_id ), 'administrator' === $role ? 120 : 60, MINUTE_IN_SECONDS );
			if ( is_wp_error( $rate ) ) return $rate;
		}
		$public_id = wp_generate_uuid4(); $now = $this->now();
		$post_id = wp_insert_post( array( 'post_type'=>'support_message', 'post_status'=>'private', 'post_parent'=>(int)$conversation->conversation_post_id, 'post_title'=>'Support message ' . $public_id, 'post_name'=>$public_id, 'post_content'=>$body, 'post_author'=>$user_id ? (int)$user_id : 0, 'post_date_gmt'=>$now ), true );
		if ( is_wp_error( $post_id ) ) return $post_id;
		$inserted = $wpdb->insert( self::message_table(), array( 'message_post_id'=>$post_id, 'public_id'=>$public_id, 'conversation_post_id'=>$conversation->conversation_post_id, 'sender_role'=>$role, 'sender_user_id'=>$user_id ?: null, 'operation_id'=>$operation, 'created_at_gmt'=>$now ), array( '%d','%s','%d','%s','%d','%s','%s' ) );
		if ( false === $inserted ) {
			wp_delete_post( $post_id, true );
			$existing = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::message_table() . ' WHERE conversation_post_id = %d AND sender_role = %s AND operation_id = %s', $conversation->conversation_post_id, $role, $operation ) );
			return $existing ? rest_ensure_response( $this->message_dto( $existing ) ) : $this->error( 'kadochi_support_storage', __( 'The message could not be sent.', 'kadochi-core' ), 500 );
		}
		foreach ( array( '_kadochi_support_public_id'=>$public_id, '_kadochi_support_sender_role'=>$role, '_kadochi_support_sender_id'=>$user_id, '_kadochi_support_operation_id'=>$operation, '_kadochi_support_created_at_gmt'=>$now, '_kadochi_support_read_at_gmt'=>'' ) as $key=>$value ) update_post_meta( $post_id, $key, $value );
		$unread = 'administrator' === $role ? 'customer_unread_count' : 'admin_unread_count';
		$status = $automated ? $conversation->status : ( 'administrator' === $role ? 'pending' : 'open' );
		$assign = 'administrator' === $role && $user_id && ! $conversation->assigned_admin_id ? $wpdb->prepare( ', assigned_admin_id = %d', $user_id ) : '';
		$wpdb->query( $wpdb->prepare( 'UPDATE ' . self::conversation_table() . " SET {$unread} = {$unread} + 1, status = %s, last_message_at_gmt = %s, updated_at_gmt = %s, revision = revision + 1 {$assign} WHERE conversation_post_id = %d", $status, $now, $now, $conversation->conversation_post_id ) );
		$this->sync_conversation_meta( $this->row_by_public_id( $conversation->public_id ) );
		$row = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::message_table() . ' WHERE message_post_id = %d', $post_id ) );
		$response = new WP_REST_Response( $this->message_dto( $row ), 201 );
		return $response;
	}

	private function insert_initial_support_message( $conversation ) {
		return $this->insert_message( $conversation, 'administrator', 0, array( 'body'=>self::INITIAL_SUPPORT_MESSAGE, 'operationId'=>$conversation->public_id ), true );
	}

	public function send_customer_message( $request ) {
		$row = $this->visible_row( $request['id'] ); if ( is_wp_error( $row ) ) return $row;
		if ( 'closed' === $row->status ) return $this->error( 'kadochi_support_closed', __( 'This conversation is closed.', 'kadochi-core' ), 409 );
		return $this->insert_message( $row, 'customer', get_current_user_id(), $this->params( $request ) );
	}

	public function send_admin_message( $request ) { $row = $this->visible_row( $request['id'], true ); return is_wp_error( $row ) ? $row : $this->insert_message( $row, 'administrator', get_current_user_id(), $this->params( $request ) ); }

	private function mark_read( $conversation, $recipient_role, $message_id ) {
		global $wpdb;
		$watermark = $wpdb->get_row( $wpdb->prepare( 'SELECT * FROM ' . self::message_table() . ' WHERE public_id = %s AND conversation_post_id = %d', strtolower( $message_id ), $conversation->conversation_post_id ) );
		if ( ! $watermark ) return $this->error( 'kadochi_support_validation', __( 'The read position is invalid.', 'kadochi-core' ), 400 );
		$sender = 'customer' === $recipient_role ? 'administrator' : 'customer'; $now = $this->now();
		$read_ids = $wpdb->get_col( $wpdb->prepare( 'SELECT message_post_id FROM ' . self::message_table() . ' WHERE conversation_post_id = %d AND sender_role = %s AND read_at_gmt IS NULL AND (created_at_gmt < %s OR (created_at_gmt = %s AND message_post_id <= %d))', $conversation->conversation_post_id, $sender, $watermark->created_at_gmt, $watermark->created_at_gmt, $watermark->message_post_id ) );
		if ( empty( $read_ids ) ) {
			$count = 'customer' === $recipient_role ? (int) $conversation->customer_unread_count : (int) $conversation->admin_unread_count;
			return rest_ensure_response( array( 'unreadCount' => $count ) );
		}
		$wpdb->query( $wpdb->prepare( 'UPDATE ' . self::message_table() . ' SET read_at_gmt = %s WHERE conversation_post_id = %d AND sender_role = %s AND read_at_gmt IS NULL AND (created_at_gmt < %s OR (created_at_gmt = %s AND message_post_id <= %d))', $now, $conversation->conversation_post_id, $sender, $watermark->created_at_gmt, $watermark->created_at_gmt, $watermark->message_post_id ) );
		foreach ( $read_ids as $read_id ) update_post_meta( (int) $read_id, '_kadochi_support_read_at_gmt', $now );
		$count = (int) $wpdb->get_var( $wpdb->prepare( 'SELECT COUNT(*) FROM ' . self::message_table() . ' WHERE conversation_post_id = %d AND sender_role = %s AND read_at_gmt IS NULL', $conversation->conversation_post_id, $sender ) );
		$column = 'customer' === $recipient_role ? 'customer_unread_count' : 'admin_unread_count';
		$wpdb->query( $wpdb->prepare( 'UPDATE ' . self::conversation_table() . " SET {$column} = %d, revision = revision + 1, updated_at_gmt = %s WHERE conversation_post_id = %d", $count, $now, $conversation->conversation_post_id ) );
		$this->sync_conversation_meta( $this->row_by_public_id( $conversation->public_id ) );
		return rest_ensure_response( array( 'unreadCount'=>$count ) );
	}

	public function mark_customer_read( $request ) { $row=$this->visible_row($request['id']); $input=$this->params($request); if(!$this->only_keys($input,array('throughMessageId')))return $this->error('kadochi_support_validation',__('The read request is invalid.','kadochi-core'),400); return is_wp_error($row)?$row:$this->mark_read($row,'customer',isset($input['throughMessageId'])?$input['throughMessageId']:''); }
	public function mark_admin_read( $request ) { $row=$this->visible_row($request['id'],true); $input=$this->params($request); if(!$this->only_keys($input,array('throughMessageId')))return $this->error('kadochi_support_validation',__('The read request is invalid.','kadochi-core'),400); return is_wp_error($row)?$row:$this->mark_read($row,'administrator',isset($input['throughMessageId'])?$input['throughMessageId']:''); }

	public function claim_guest_conversations() {
		global $wpdb;
		$guest_id = $this->guest_id();
		if ( ! $guest_id ) return rest_ensure_response( array( 'conversation'=>$this->conversation_dto( $this->current_row( $this->owner() ) ) ) );
		$customer_id = get_current_user_id(); $customer = $this->customer_identity();
		$customer_active = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM " . self::conversation_table() . " WHERE owner_type='customer' AND customer_id=%d AND status<>'closed' AND merged_into_public_id IS NULL ORDER BY COALESCE(last_message_at_gmt,created_at_gmt) DESC LIMIT 1", $customer_id ) );
		$guest_active = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM " . self::conversation_table() . " WHERE owner_type='guest' AND guest_id=%s AND status<>'closed' AND merged_into_public_id IS NULL ORDER BY COALESCE(last_message_at_gmt,created_at_gmt) DESC LIMIT 1", $guest_id ) );
		if ( $customer_active && $guest_active ) {
			$wpdb->update( self::message_table(), array( 'conversation_post_id'=>$customer_active->conversation_post_id ), array( 'conversation_post_id'=>$guest_active->conversation_post_id ), array('%d'), array('%d') );
			$wpdb->query( $wpdb->prepare( "UPDATE {$wpdb->posts} SET post_parent=%d WHERE post_type='support_message' AND post_parent=%d", $customer_active->conversation_post_id, $guest_active->conversation_post_id ) );
			$wpdb->update( self::conversation_table(), array( 'status'=>'closed', 'merged_into_public_id'=>$customer_active->public_id, 'updated_at_gmt'=>$this->now() ), array( 'conversation_post_id'=>$guest_active->conversation_post_id ), array('%s','%s','%s'), array('%d') );
		}
		$exclude = $guest_active && $customer_active ? (int) $guest_active->conversation_post_id : 0;
		$wpdb->query( $wpdb->prepare( 'UPDATE ' . self::conversation_table() . " SET owner_type='customer', customer_id=%d, guest_id=NULL, display_name=%s, email=%s, phone=%s, revision=revision+1, updated_at_gmt=%s WHERE owner_type='guest' AND guest_id=%s AND conversation_post_id<>%d", $customer_id, $customer['display_name'], $customer['email'], $customer['phone'], $this->now(), $guest_id, $exclude ) );
		$target = $customer_active ?: ( $guest_active ? $this->row_by_public_id( $guest_active->public_id ) : $this->current_row( $this->owner() ) );
		if ( $customer_active ) {
			$customer_unread = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM ".self::message_table()." WHERE conversation_post_id=%d AND sender_role='administrator' AND read_at_gmt IS NULL",$customer_active->conversation_post_id));
			$admin_unread = (int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM ".self::message_table()." WHERE conversation_post_id=%d AND sender_role='customer' AND read_at_gmt IS NULL",$customer_active->conversation_post_id));
			$wpdb->update(self::conversation_table(),array('customer_unread_count'=>$customer_unread,'admin_unread_count'=>$admin_unread,'revision'=>(int)$customer_active->revision+1),array('conversation_post_id'=>$customer_active->conversation_post_id),array('%d','%d','%d'),array('%d'));
			$target=$this->row_by_public_id($customer_active->public_id);
		}
		if ( $guest_active && $customer_active ) $this->sync_conversation_meta( $this->row_by_public_id( $guest_active->public_id ) );
		$claimed_rows = $wpdb->get_results( $wpdb->prepare( 'SELECT * FROM ' . self::conversation_table() . ' WHERE owner_type=%s AND customer_id=%d', 'customer', $customer_id ) );
		foreach ( $claimed_rows as $claimed_row ) $this->sync_conversation_meta( $claimed_row );
		return rest_ensure_response( array( 'conversation'=>$target?$this->conversation_dto($target):null, 'claimed'=>true ) );
	}

	public function admin_list_conversations( $request ) {
		global $wpdb;
		$page=max(1,(int)$request->get_param('page')); $per=max(1,min(50,(int)$request->get_param('per_page')?:20)); $where=array('merged_into_public_id IS NULL'); $args=array();
		$status=sanitize_key((string)$request->get_param('status')); if(in_array($status,array('open','pending','closed'),true)){ $where[]='status=%s'; $args[]=$status; }
		$assigned=$request->get_param('assigned_admin_id'); if('unassigned'===$assigned){$where[]='assigned_admin_id IS NULL';}elseif(null!==$assigned&&''!==$assigned){ $where[]='assigned_admin_id=%d'; $args[]=absint($assigned); }
		$search=sanitize_text_field((string)$request->get_param('search')); if($search){$like='%'.$wpdb->esc_like($search).'%';$where[]='(display_name LIKE %s OR email LIKE %s OR phone LIKE %s)';array_push($args,$like,$like,$like);}
		$from=sanitize_text_field((string)$request->get_param('date_from')); if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$from)){$where[]='created_at_gmt >= %s';$args[]=$from.' 00:00:00';}
		$to=sanitize_text_field((string)$request->get_param('date_to')); if(preg_match('/^\d{4}-\d{2}-\d{2}$/',$to)){$where[]='created_at_gmt <= %s';$args[]=$to.' 23:59:59';}
		$sql=' FROM '.self::conversation_table().' WHERE '.implode(' AND ',$where); $count_sql='SELECT COUNT(*)'.$sql; $list_sql='SELECT *'.$sql.' ORDER BY admin_unread_count DESC, COALESCE(last_message_at_gmt,created_at_gmt) DESC LIMIT %d OFFSET %d';
		$total=(int)$wpdb->get_var($args?$wpdb->prepare($count_sql,$args):$count_sql); $list_args=array_merge($args,array($per,($page-1)*$per)); $rows=$wpdb->get_results($wpdb->prepare($list_sql,$list_args));
		return rest_ensure_response(array('items'=>array_map(function($row){return $this->conversation_dto($row,true);},$rows),'page'=>$page,'perPage'=>$per,'total'=>$total,'totalPages'=>(int)ceil($total/$per),'agents'=>$this->admin_agents()));
	}

	private function admin_agents(){return array_map(function($user){return array('id'=>(int)$user->ID,'displayName'=>sanitize_text_field($user->display_name));},get_users(array('capability'=>self::CAPABILITY,'orderby'=>'display_name','order'=>'ASC')));}
	public function admin_get_conversation($request){$row=$this->visible_row($request['id'],true);return is_wp_error($row)?$row:rest_ensure_response(array('conversation'=>$this->conversation_dto($row,true),'agents'=>$this->admin_agents()));}
	public function admin_list_messages($request){$row=$this->visible_row($request['id'],true);if(is_wp_error($row))return $row;$messages=$this->messages_response($row,$request);return is_wp_error($messages)?$messages:rest_ensure_response($messages);}

	public function admin_update_conversation($request){
		global $wpdb; $row=$this->visible_row($request['id'],true); if(is_wp_error($row))return $row; $input=$this->params($request);
		if(!$this->only_keys($input,array('status','assignedAdminId','version')))return $this->error('kadochi_support_validation',__('The update request is invalid.','kadochi-core'),400);
		if(!isset($input['version'])||!is_string($input['version'])||!hash_equals($this->version($row),$input['version']))return $this->error('kadochi_support_conflict',__('The conversation changed. Refresh and try again.','kadochi-core'),409);
		$updates=array();$formats=array();
		if(isset($input['status'])){if(!in_array($input['status'],array('open','pending','closed'),true))return $this->error('kadochi_support_validation',__('Invalid conversation status.','kadochi-core'),400);$updates['status']=$input['status'];$formats[]='%s';}
		if(array_key_exists('assignedAdminId',$input)){$admin_id=null===$input['assignedAdminId']?null:absint($input['assignedAdminId']);if($admin_id&&!user_can($admin_id,self::CAPABILITY))return $this->error('kadochi_support_validation',__('Invalid support agent.','kadochi-core'),400);$updates['assigned_admin_id']=$admin_id;$formats[]='%d';}
		if(!$updates)return $this->error('kadochi_support_validation',__('Provide a status or assignment.','kadochi-core'),400);
		$updates['revision']=(int)$row->revision+1;$formats[]='%d';$updates['updated_at_gmt']=$this->now();$formats[]='%s';
		$updated=$wpdb->update(self::conversation_table(),$updates,array('conversation_post_id'=>$row->conversation_post_id,'revision'=>$row->revision),$formats,array('%d','%d'));
		if(!$updated)return $this->error('kadochi_support_conflict',__('The conversation changed. Refresh and try again.','kadochi-core'),409);
		$updated_row=$this->row_by_public_id($row->public_id);$this->sync_conversation_meta($updated_row);
		return rest_ensure_response(array('conversation'=>$this->conversation_dto($updated_row,true)));
	}

	public function add_admin_page(){add_menu_page(__('Support','kadochi-core'),__('Support','kadochi-core'),self::CAPABILITY,'kadochi-support',array($this,'render_admin_page'),'dashicons-format-chat',56);}
	public function enqueue_admin_assets($hook){if('toplevel_page_kadochi-support'!==$hook)return;wp_enqueue_style('kadochi-support-admin',plugins_url('../assets/support-admin.css',__FILE__),array(),'4');wp_enqueue_script('kadochi-support-quick-replies',plugins_url('../assets/support-quick-replies.js',__FILE__),array(),'1',true);wp_enqueue_script('kadochi-support-admin',plugins_url('../assets/support-admin.js',__FILE__),array('kadochi-support-quick-replies'),'4',true);wp_localize_script('kadochi-support-admin','KadochiSupportAdmin',array('root'=>esc_url_raw(rest_url(Kadochi_Core::REST_NAMESPACE.'/support/admin')),'nonce'=>wp_create_nonce('wp_rest')));}
	public function render_admin_page(){if(!current_user_can(self::CAPABILITY))wp_die(esc_html__('You cannot manage support conversations.','kadochi-core'));?>
		<div class="wrap kadochi-support-admin"><h1><?php esc_html_e('Support center','kadochi-core');?></h1><div id="kadochi-support-app" aria-live="polite"><p><?php esc_html_e('Loading conversations…','kadochi-core');?></p></div></div>
	<?php }
}
