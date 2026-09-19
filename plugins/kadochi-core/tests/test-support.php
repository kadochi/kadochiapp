<?php
/** @group support */
final class Kadochi_Support_Test extends WP_UnitTestCase {
	private $support;

	public function set_up() {
		parent::set_up();
		Kadochi_Support::activate();
		$this->support = new Kadochi_Support();
		$this->support->register_post_types();
		$this->support->register_routes();
		unset( $_SERVER['HTTP_X_KADOCHI_SUPPORT_GUEST'] );
		wp_set_current_user( 0 );
	}

	public function tear_down() {
		unset( $_SERVER['HTTP_X_KADOCHI_SUPPORT_GUEST'] );
		parent::tear_down();
	}

	public function test_guest_can_create_resume_send_idempotently_and_foreign_token_cannot_read() {
		$create = new WP_REST_Request( 'POST', '/kadochi/v1/support/conversations' );
		$create->set_body_params( array( 'displayName' => 'مهمان تست', 'phone' => '09121234567' ) );
		$response = $this->support->create_or_resume( $create );
		$this->assertSame( 201, $response->get_status() );
		$conversation = $response->get_data()['conversation'];
		$this->assertMatchesRegularExpression( '/^[a-f0-9-]{36}$/', $conversation['id'] );
		$_SERVER['HTTP_X_KADOCHI_SUPPORT_GUEST'] = $response->get_headers()['X-Kadochi-Support-Guest'];
		$list = new WP_REST_Request( 'GET', '/kadochi/v1/support/conversations/' . $conversation['id'] . '/messages' );
		$list['id'] = $conversation['id'];
		$initial_messages = $this->support->list_messages( $list )->get_data()['items'];
		$this->assertCount( 1, $initial_messages );
		$this->assertSame( 'administrator', $initial_messages[0]['senderRole'] );
		$this->assertSame( Kadochi_Support::INITIAL_SUPPORT_MESSAGE, $initial_messages[0]['body'] );

		$send = new WP_REST_Request( 'POST', '/kadochi/v1/support/conversations/' . $conversation['id'] . '/messages' );
		$send['id'] = $conversation['id'];
		$send->set_body_params( array( 'body' => 'سلام', 'operationId' => '123e4567-e89b-42d3-a456-426614174000' ) );
		$first = $this->support->send_customer_message( $send );
		$second = $this->support->send_customer_message( $send );
		$this->assertSame( $first->get_data()['id'], $second->get_data()['id'] );

		$_SERVER['HTTP_X_KADOCHI_SUPPORT_GUEST'] .= 'tampered';
		$read = new WP_REST_Request( 'GET', '/kadochi/v1/support/conversations/' . $conversation['id'] );
		$read['id'] = $conversation['id'];
		$error = $this->support->get_conversation( $read );
		$this->assertWPError( $error );
		$this->assertSame( 404, $error->get_error_data()['status'] );
	}

	public function test_support_types_are_private_and_staff_updates_are_versioned() {
		$type = get_post_type_object( 'support_conversation' );
		$this->assertFalse( $type->public );
		$this->assertFalse( $type->show_ui );

		$admin_id = self::factory()->user->create( array( 'role' => 'administrator' ) );
		wp_set_current_user( $admin_id );
		$create = new WP_REST_Request( 'POST', '/kadochi/v1/support/conversations' );
		$create->set_body_params( array() );
		$response = $this->support->create_or_resume( $create );
		$conversation = $response->get_data()['conversation'];
		$update = new WP_REST_Request( 'PATCH', '/kadochi/v1/support/admin/conversations/' . $conversation['id'] );
		$update['id'] = $conversation['id'];
		$update->set_body_params( array( 'status' => 'closed', 'version' => $conversation['version'] ) );
		$this->assertSame( 'closed', $this->support->admin_update_conversation( $update )->get_data()['conversation']['status'] );
		$this->assertWPError( $this->support->admin_update_conversation( $update ) );
	}
}
