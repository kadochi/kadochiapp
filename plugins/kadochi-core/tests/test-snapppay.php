<?php
require_once __DIR__ . '/snapppay-fakes.inc';

/** @group snapppay */
final class Kadochi_SnappPay_Test extends WP_UnitTestCase {
	/** @var Kadochi_Test_Snapp_Client */
	private $client;
	/** @var Kadochi_Test_Snapp_Core */
	private $core;
	/** @var Kadochi_Test_Snapp_Order */
	private $order;
	/** @var Kadochi_SnappPay */
	private $service;

	public function set_up() {
		parent::set_up();
		foreach ( array( 'KADOCHI_PAYMENT_METHOD_IDS', 'KADOCHI_PAYMENT_METHOD_ID', 'SNAPPPAY_PAYMENT_HOSTS', 'SNAPPPAY_REVERT_ON_FAILED', 'SNAPPPAY_FORCED_METHODS' ) as $name ) {
			putenv( $name );
		}
		$this->client = new Kadochi_Test_Snapp_Client();
		$this->core = new Kadochi_Test_Snapp_Core();
		$this->order = self::order();
		$order = $this->order;
		$this->service = new Kadochi_SnappPay( $this->client, $this->core, function ( $transaction_id ) use ( $order ) {
			return in_array( $transaction_id, array_keys( (array) $order->get_meta( Kadochi_SnappPay::META_ATTEMPTS, true ) ), true ) ? $order : null;
		} );
	}

	/** 2 × 1,250,000 + 1 × 800,000 items, 50,000 fee, 300,000 shipping, 330,500 tax, 200,000 discount. */
	private static function order() {
		$order = new Kadochi_Test_Snapp_Order();
		$order->items = array(
			11 => new Kadochi_Test_Snapp_Item( 101, 'Rose box', 2, 2500000 ),
			12 => new Kadochi_Test_Snapp_Item( 102, 'Card', 1, 800000 ),
		);
		$order->fees = array( new Kadochi_Test_Snapp_Fee( 50000 ) );
		$order->shipping = 300000;
		$order->tax = 330500;
		$order->discount = 200000;
		$order->total = 2500000 + 800000 + 50000 + 300000 + 330500 - 200000;
		return $order;
	}

	private function start() {
		$this->client->script( 'token', Kadochi_Test_Snapp_Client::ok( array( 'paymentToken' => 'tok-1', 'paymentPageUrl' => 'https://snapp.example/pay/tok-1' ) ) );
		$redirect = $this->service->start_payment( $this->order, 'https://api.kadochi.test/wc-api/kadochi_snapppay/' );
		$this->assertSame( 'https://snapp.example/pay/tok-1', $redirect );
		return (string) $this->order->get_meta( Kadochi_SnappPay::META_TRANSACTION, true );
	}

	private static function assert_identities( $test, array $payload, $expected_amount ) {
		$cart = $payload['cartList'][0];
		$items = 0;
		foreach ( $cart['cartItems'] as $item ) {
			$test->assertIsInt( $item['amount'] );
			$items += $item['count'] * $item['amount'];
		}
		$test->assertSame( $cart['totalAmount'], $items + $cart['shippingAmount'] + $cart['taxAmount'] );
		$test->assertSame( $payload['amount'], $cart['totalAmount'] - $payload['discountAmount'] - $payload['externalSourceAmount'] );
		$test->assertSame( $expected_amount, $payload['amount'] );
	}

	public function test_payload_satisfies_amount_identities_and_adds_fee_line() {
		$payload = Kadochi_SnappPay::build_cart_payload( $this->order );
		self::assert_identities( $this, $payload, 3780500 );
		$this->assertCount( 3, $payload['cartList'][0]['cartItems'] );
		$this->assertSame( array( 'id' => 101, 'amount' => 1250000, 'category' => 'gift', 'count' => 2, 'name' => 'Rose box', 'commissionType' => 100 ), $payload['cartList'][0]['cartItems'][0] );
		$this->assertSame( 50000, $payload['cartList'][0]['cartItems'][2]['amount'] );
		$this->assertFalse( $payload['cartList'][0]['isShipmentIncluded'] );
		$this->assertSame( 4321, $payload['cartList'][0]['cartId'] );
	}

	public function test_toman_orders_are_converted_to_rials() {
		$this->order->currency = 'IRT';
		$this->order->items = array( 1 => new Kadochi_Test_Snapp_Item( 5, 'Gift', 1, 45000 ) );
		$this->order->fees = array();
		$this->order->shipping = 0;
		$this->order->tax = 4500;
		$this->order->discount = 0;
		$this->order->total = 49500;
		self::assert_identities( $this, Kadochi_SnappPay::build_cart_payload( $this->order ), 495000 );
		$this->assertSame( 50, Kadochi_SnappPay::to_irr( 5, 'IRT' ) );
		$this->assertNull( Kadochi_SnappPay::to_irr( 5, 'USD' ) );
	}

	public function test_rounding_drift_is_folded_and_real_mismatch_fails_closed() {
		// Three units at 333,333.33 each round per unit; the drift is absorbed.
		$this->order->items = array( 1 => new Kadochi_Test_Snapp_Item( 5, 'Gift', 3, 1000000 ) );
		$this->order->fees = array();
		$this->order->shipping = 0;
		$this->order->tax = 0;
		$this->order->discount = 0;
		$this->order->total = 1000000;
		self::assert_identities( $this, Kadochi_SnappPay::build_cart_payload( $this->order ), 1000000 );

		$this->order->total = 1500000;
		$result = Kadochi_SnappPay::build_cart_payload( $this->order );
		$this->assertWPError( $result );
		$this->assertSame( 'kadochi_snapppay_payload_mismatch', $result->get_error_code() );
	}

	public function test_transaction_ids_are_short_lettered_and_unique_per_attempt() {
		$ids = array();
		foreach ( array( 1, 4321, 2147483647 ) as $order_id ) {
			foreach ( array( 1, 2, 37 ) as $attempt ) {
				$id = Kadochi_SnappPay::transaction_id( $order_id, $attempt );
				$this->assertMatchesRegularExpression( '/^KS[0-9A-Z]{3,8}$/', $id );
				$this->assertGreaterThanOrEqual( 5, strlen( $id ) );
				$this->assertLessThanOrEqual( 10, strlen( $id ) );
				$ids[] = $id;
			}
		}
		$this->assertSame( $ids, array_unique( $ids ) );
	}

	public function test_start_payment_stores_attempt_and_regenerates_id_on_conflict() {
		$this->client->script( 'token', Kadochi_Test_Snapp_Client::fail( 409, 1009 ) );
		$transaction_id = $this->start();
		$this->assertSame( 2, $this->client->count( 'token' ) );
		$this->assertNotSame( $this->client->calls[0][1]['transactionId'], $this->client->calls[1][1]['transactionId'] );
		$this->assertSame( $transaction_id, $this->client->calls[1][1]['transactionId'] );
		$this->assertSame( '+989121234567', $this->client->calls[1][1]['mobile'] );
		$this->assertSame( 'tok-1', $this->order->get_meta( Kadochi_SnappPay::META_TOKEN, true ) );
		$this->assertSame( 3780500, $this->order->get_meta( Kadochi_SnappPay::META_AMOUNT, true ) );
		$this->assertSame( array( 'https://snapp.example/pay/tok-1' ), $this->core->redirects );
		$this->assertStringNotContainsString( 'tok-1', wp_json_encode( $this->core->logs ) );
	}

	public function test_start_payment_rejects_invalid_mobile_and_untrusted_page() {
		$this->order->phone = '12345';
		$result = $this->service->start_payment( $this->order, 'https://api.kadochi.test/cb' );
		$this->assertWPError( $result );
		$this->assertStringContainsString( '[snapppay:1005]', $result->get_error_message() );
		$this->assertSame( 0, $this->client->count( 'token' ) );

		$this->order->phone = '09121234567';
		$this->client->script( 'token', Kadochi_Test_Snapp_Client::ok( array( 'paymentToken' => 't', 'paymentPageUrl' => 'https://evil.example/pay' ) ) );
		$this->assertWPError( $this->service->start_payment( $this->order, 'https://api.kadochi.test/cb' ) );
		$this->assertSame( array( 'gateway_failure' ), $this->core->released );
	}

	public function test_ok_callback_verifies_then_settles() {
		$transaction_id = $this->start();
		$url = $this->service->handle_callback( array( 'transactionId' => $transaction_id, 'state' => 'OK', 'amount' => '3780500' ) );
		$this->assertSame( 'https://kadochi.test/checkout/return?order=4321', $url );
		$this->assertTrue( $this->order->paid );
		$this->assertSame( $transaction_id, $this->order->completed_with );
		$this->assertSame( 'SETTLE', $this->order->get_meta( Kadochi_SnappPay::META_STATUS, true ) );
		$this->assertSame( 1, $this->client->count( 'verify' ) );
		$this->assertSame( 1, $this->client->count( 'settle' ) );
	}

	public function test_verify_timeout_resumes_from_verify_status() {
		$transaction_id = $this->start();
		$this->client->script( 'verify', Kadochi_Test_Snapp_Client::fail( 0, 'timeout', true ) )
			->script( 'status', Kadochi_Test_Snapp_Client::ok( array( 'status' => 'VERIFY' ) ) );
		$this->service->handle_callback( array( 'transactionId' => $transaction_id, 'state' => 'OK', 'amount' => '3780500' ) );
		$this->assertTrue( $this->order->paid );
		$this->assertSame( 1, $this->client->count( 'verify' ) );
		$this->assertSame( 1, $this->client->count( 'settle' ) );
	}

	public function test_pending_after_verify_failure_is_verified_again() {
		$transaction_id = $this->start();
		$this->client->script( 'verify', Kadochi_Test_Snapp_Client::fail( 503 ) )
			->script( 'status', Kadochi_Test_Snapp_Client::ok( array( 'status' => 'PENDING' ) ) );
		$this->service->handle_callback( array( 'transactionId' => $transaction_id, 'state' => 'OK', 'amount' => '3780500' ) );
		$this->assertTrue( $this->order->paid );
		$this->assertSame( 2, $this->client->count( 'verify' ) );
	}

	public function test_failed_callback_fails_order_without_verify() {
		$transaction_id = $this->start();
		$url = $this->service->handle_callback( array( 'transactionId' => $transaction_id, 'state' => 'FAILED', 'amount' => '3780500' ) );
		$this->assertSame( 'https://kadochi.test/checkout/failure?order=4321', $url );
		$this->assertSame( 'failed', $this->order->status );
		$this->assertSame( 0, $this->client->count( 'verify' ) );
		$this->assertSame( 0, $this->client->count( 'revert' ) );
		$this->assertContains( 'cancelled', $this->core->released );
	}

	public function test_amount_mismatch_is_left_for_reconciliation() {
		$transaction_id = $this->start();
		$this->client->script( 'status', Kadochi_Test_Snapp_Client::ok( array( 'status' => 'PENDING', 'amount' => 1 ) ) );
		$this->service->handle_callback( array( 'transactionId' => $transaction_id, 'state' => 'OK', 'amount' => '1' ) );
		$this->assertFalse( $this->order->paid );
		$this->assertSame( 'UNKNOWN', $this->order->get_meta( Kadochi_SnappPay::META_STATUS, true ) );
		$this->assertSame( 0, $this->client->count( 'verify' ) );
	}

	public function test_duplicate_callback_does_not_verify_twice() {
		$transaction_id = $this->start();
		$callback = array( 'transactionId' => $transaction_id, 'state' => 'OK', 'amount' => '3780500' );
		$this->service->handle_callback( $callback );
		$this->service->handle_callback( $callback );
		$this->assertSame( 1, $this->client->count( 'verify' ) );
		$this->assertSame( 0, $this->client->count( 'revert' ) );
	}

	public function test_held_finalize_lock_skips_verification() {
		$transaction_id = $this->start();
		add_option( 'kadochi_snapppay_finalize_4321', time(), '', 'no' );
		$url = $this->service->handle_callback( array( 'transactionId' => $transaction_id, 'state' => 'OK', 'amount' => '3780500' ) );
		$this->assertSame( 'https://kadochi.test/checkout/return?order=4321', $url );
		$this->assertSame( 0, $this->client->count( 'verify' ) );
		delete_option( 'kadochi_snapppay_finalize_4321' );
	}

	public function test_unknown_transaction_goes_to_failure() {
		$this->assertSame( 'https://kadochi.test/checkout/failure', $this->service->handle_callback( array( 'transactionId' => 'KSZZZZ01', 'state' => 'OK', 'amount' => '1' ) ) );
	}

	public function test_reconcile_settles_verified_payment_but_never_verifies_without_callback() {
		$this->start();
		$this->client->script( 'status', Kadochi_Test_Snapp_Client::ok( array( 'status' => 'PENDING' ) ) );
		$this->assertSame( 'unknown', $this->service->reconcile( $this->order ) );
		$this->assertSame( 0, $this->client->count( 'verify' ) );

		$this->client->script( 'status', Kadochi_Test_Snapp_Client::ok( array( 'status' => 'VERIFY' ) ) );
		$this->assertSame( 'paid', $this->service->reconcile( $this->order ) );
		$this->assertTrue( $this->order->paid );
	}

	private function settled() {
		$transaction_id = $this->start();
		$this->service->handle_callback( array( 'transactionId' => $transaction_id, 'state' => 'OK', 'amount' => '3780500' ) );
		$this->assertTrue( $this->order->paid );
	}

	public function test_full_refund_cancels() {
		$this->settled();
		$this->order->refunded = $this->order->total;
		$this->assertTrue( $this->service->refund( $this->order, $this->order->total ) );
		$this->assertSame( 1, $this->client->count( 'cancel' ) );
		$this->assertSame( 'CANCEL', $this->order->get_meta( Kadochi_SnappPay::META_STATUS, true ) );
	}

	public function test_partial_refund_updates_remaining_cart() {
		$this->settled();
		$this->order->refunded = 1250000;
		$this->order->refunded_qty = array( 11 => 1 );
		$this->assertTrue( $this->service->refund( $this->order, 1250000 ) );
		$payload = $this->client->calls[ count( $this->client->calls ) - 1 ][1];
		self::assert_identities( $this, $payload, 3780500 - 1250000 );
		$this->assertSame( 1, $payload['cartList'][0]['cartItems'][0]['count'] );
		$this->assertSame( 'tok-1', $payload['paymentToken'] );
	}

	public function test_partial_refund_with_snapp_discount_asks_for_cancel() {
		$this->settled();
		$this->order->refunded = 100000;
		$this->client->script( 'update', Kadochi_Test_Snapp_Client::fail( 400, 1078 ) );
		$result = $this->service->refund( $this->order, 100000 );
		$this->assertWPError( $result );
		$this->assertStringContainsString( 'Refund the full order', $result->get_error_message() );
	}

	public function test_payment_method_allow_list_and_legacy_fallback() {
		$core = Kadochi_Core::instance();
		putenv( 'KADOCHI_PAYMENT_METHOD_ID=Legacy_Gateway' );
		$this->assertSame( array( 'Legacy_Gateway' ), $core->payment_method_ids() );
		putenv( 'KADOCHI_PAYMENT_METHOD_IDS= WC_ZPal, kadochi_snapppay ,bad id,WC_ZPal' );
		$this->assertSame( array( 'WC_ZPal', 'kadochi_snapppay' ), $core->payment_method_ids() );
		$this->assertTrue( $core->is_allowed_payment_method( 'kadochi_snapppay' ) );
		$this->assertFalse( $core->is_allowed_payment_method( 'wc_zpal' ) );
	}

	public function test_trusted_gateway_redirect_hosts() {
		$core = Kadochi_Core::instance();
		putenv( 'SNAPPPAY_PAYMENT_HOSTS=pay.snapp.example' );
		$this->assertSame( 'https://payment.zarinpal.com/pg/StartPay/x', $core->trusted_gateway_redirect( 'https://payment.zarinpal.com/pg/StartPay/x', 'WC_ZPal' ) );
		$this->assertFalse( $core->trusted_gateway_redirect( 'https://pay.snapp.example/x', 'WC_ZPal' ) );
		$this->assertSame( 'https://pay.snapp.example/x', $core->trusted_gateway_redirect( 'https://pay.snapp.example/x', 'kadochi_snapppay' ) );
		$this->assertFalse( $core->trusted_gateway_redirect( 'http://pay.snapp.example/x', 'kadochi_snapppay' ) );
		$this->assertFalse( $core->trusted_gateway_redirect( 'https://payment.zarinpal.com/x', 'kadochi_snapppay' ) );
	}
}
