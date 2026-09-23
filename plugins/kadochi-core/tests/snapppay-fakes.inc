<?php
/** Duck-typed WooCommerce and Snapp! Pay doubles shared by the Snapp! Pay tests. */

final class Kadochi_Test_Snapp_Item {
	public $product_id;
	public $name;
	public $quantity;
	public $subtotal;

	public function __construct( $product_id, $name, $quantity, $subtotal ) {
		$this->product_id = $product_id;
		$this->name = $name;
		$this->quantity = $quantity;
		$this->subtotal = $subtotal;
	}

	public function get_product_id() { return $this->product_id; }
	public function get_name() { return $this->name; }
	public function get_quantity() { return $this->quantity; }
	public function get_subtotal() { return $this->subtotal; }
}

final class Kadochi_Test_Snapp_Fee {
	public $total;
	public function __construct( $total ) { $this->total = $total; }
	public function get_total() { return $this->total; }
}

final class Kadochi_Test_Snapp_Order {
	public $id = 4321;
	public $currency = 'IRR';
	public $items = array();
	public $fees = array();
	public $discount = 0;
	public $shipping = 0;
	public $tax = 0;
	public $total = 0;
	public $phone = '09121234567';
	public $status = 'pending';
	public $paid = false;
	public $payment_method = 'kadochi_snapppay';
	public $meta = array();
	public $notes = array();
	public $completed_with = null;
	public $refunded = 0;
	public $refunded_qty = array();
	public $refunded_shipping = 0;
	public $refunded_tax = 0;

	public function get_id() { return $this->id; }
	public function get_currency() { return $this->currency; }
	public function get_items( $type = 'line_item' ) { return $this->items; }
	public function get_fees() { return $this->fees; }
	public function get_discount_total() { return $this->discount; }
	public function get_shipping_total() { return $this->shipping; }
	public function get_total_tax() { return $this->tax; }
	public function get_total() { return $this->total; }
	public function get_billing_phone() { return $this->phone; }
	public function get_customer_id() { return 0; }
	public function get_status() { return $this->status; }
	public function get_payment_method() { return $this->payment_method; }
	public function is_paid() { return $this->paid; }
	public function get_total_refunded() { return $this->refunded; }
	public function get_qty_refunded_for_item( $item_id ) { return isset( $this->refunded_qty[ $item_id ] ) ? -abs( $this->refunded_qty[ $item_id ] ) : 0; }
	public function get_total_shipping_refunded() { return $this->refunded_shipping; }
	public function get_total_tax_refunded() { return $this->refunded_tax; }
	public function get_meta( $key, $single = true ) {
		if ( ! isset( $this->meta[ $key ] ) ) {
			return '';
		}
		return is_array( $this->meta[ $key ] ) && isset( $this->meta[ $key ]['__multi'] ) ? $this->meta[ $key ]['__multi'][0] : $this->meta[ $key ];
	}
	public function update_meta_data( $key, $value ) { $this->meta[ $key ] = $value; }
	public function add_meta_data( $key, $value, $unique = false ) {
		$existing = isset( $this->meta[ $key ]['__multi'] ) ? $this->meta[ $key ]['__multi'] : array();
		$existing[] = $value;
		$this->meta[ $key ] = array( '__multi' => $existing );
	}
	public function delete_meta_data( $key ) { unset( $this->meta[ $key ] ); }
	public function save() { return $this->id; }
	public function update_status( $status, $note = '' ) { $this->status = $status; $this->notes[] = $note; }
	public function add_order_note( $note ) { $this->notes[] = $note; }
	public function payment_complete( $transaction_id = '' ) { $this->paid = true; $this->status = 'processing'; $this->completed_with = $transaction_id; }
}

/** Scripted Snapp client: each operation pops its next queued result (default: success). */
final class Kadochi_Test_Snapp_Client {
	public $calls = array();
	public $queue = array();
	public $configured = true;

	public function is_configured() { return $this->configured; }
	public function base_host() { return 'snapp.example'; }

	public static function ok( $data = array() ) {
		return array( 'ok' => true, 'httpStatus' => 200, 'errorCode' => null, 'message' => '', 'data' => $data, 'timedOut' => false );
	}

	public static function fail( $status, $code = null, $timed_out = false ) {
		return array( 'ok' => false, 'httpStatus' => $status, 'errorCode' => $code, 'message' => '', 'data' => null, 'timedOut' => $timed_out );
	}

	public function script( $operation, array $result ) {
		$this->queue[ $operation ][] = $result;
		return $this;
	}

	private function next( $operation, $argument ) {
		$this->calls[] = array( $operation, $argument );
		return empty( $this->queue[ $operation ] ) ? self::ok() : array_shift( $this->queue[ $operation ] );
	}

	public function count( $operation ) {
		return count( array_filter( $this->calls, function ( $call ) use ( $operation ) { return $call[0] === $operation; } ) );
	}

	public function payment_token( array $payload ) { return $this->next( 'token', $payload ); }
	public function verify( $token ) { return $this->next( 'verify', $token ); }
	public function settle( $token ) { return $this->next( 'settle', $token ); }
	public function status( $token ) { return $this->next( 'status', $token ); }
	public function revert( $token ) { return $this->next( 'revert', $token ); }
	public function cancel( $token ) { return $this->next( 'cancel', $token ); }
	public function update( array $payload ) { return $this->next( 'update', $payload ); }
	public function eligible( $amount ) { $this->calls[] = array( 'eligible', $amount ); return array( 'eligible' => false, 'title' => '', 'description' => '' ); }
}

/** Minimal stand-in for the Kadochi_Core payment helpers the service calls. */
final class Kadochi_Test_Snapp_Core {
	public $released = array();
	public $redirects = array();
	public $logs = array();

	public function payment_log( $event, $context = array(), $gateway = 'zarinpal' ) { $this->logs[] = array( $event, $context, $gateway ); }
	public function release_payment_attempt( $order, $attempt_id = null, $reason = 'gateway_failure' ) { $this->released[] = $reason; }
	public function frontend_checkout_result_url( $result, $order ) { return 'https://kadochi.test/checkout/' . $result . ( $order ? '?order=' . $order->get_id() : '' ); }
	public function gateway_attempt_started( $order ) { return true; }
	public function gateway_attempt_redirect( $order, $redirect, $ttl = 0 ) { $this->redirects[] = $redirect; }
	public function trusted_gateway_redirect( $url, $gateway_id ) { return 0 === strpos( (string) $url, 'https://snapp.example/' ) ? $url : false; }
}
