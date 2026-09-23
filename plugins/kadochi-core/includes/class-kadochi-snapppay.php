<?php
/**
 * Snapp! Pay payment lifecycle: token payload, callback finalisation
 * (verify → settle), reconciliation, and refund-driven cancel/update.
 *
 * Kept independent of WC_Payment_Gateway so it can run from the callback,
 * cron, admin actions, and tests with duck-typed WC_Order objects.
 */

defined( 'ABSPATH' ) || exit;

final class Kadochi_SnappPay {
	const GATEWAY_ID = 'kadochi_snapppay';
	const TITLE = 'پرداخت اقساطی اسنپ‌پی';
	const FINALIZE_LOCK_SECONDS = 120;
	const PAYMENT_PAGE_TTL = 900;
	const MAX_ATTEMPT_HISTORY = 10;
	const RECONCILE_HOOK = 'kadochi_snapppay_reconcile';

	const META_TOKEN = '_kadochi_snapppay_token';
	const META_TRANSACTION = '_kadochi_snapppay_transaction_id';
	const META_TRANSACTION_LOOKUP = '_kadochi_snapppay_txn';
	const META_AMOUNT = '_kadochi_snapppay_amount_irr';
	const META_ATTEMPTS = '_kadochi_snapppay_attempts';
	const META_SEQUENCE = '_kadochi_snapppay_attempt_seq';
	const META_STATUS = '_kadochi_snapppay_status';
	const META_SETTLED_TRANSACTION = '_kadochi_snapppay_settled_txn';
	const META_LAST_SYNC = '_kadochi_snapppay_last_sync';
	const META_CALLBACK_OK = '_kadochi_snapppay_callback_ok';

	/** Local statuses that no longer need reconciliation. */
	const FINAL_STATUSES = array( 'SETTLE', 'FAILED', 'REVERT', 'CANCEL' );

	/** @var Kadochi_SnappPay_Client */
	private $client;
	/** @var object Kadochi_Core, or a test double exposing the same public payment helpers. */
	private $core;
	/** @var callable fn( string $transaction_id ): WC_Order|null */
	private $order_finder;

	public function __construct( $client, $core, $order_finder = null ) {
		$this->client = $client;
		$this->core = $core;
		$this->order_finder = $order_finder ?: array( $this, 'find_order_by_transaction' );
	}

	public function client() {
		return $this->client;
	}

	public function is_configured() {
		return $this->client->is_configured();
	}

	/** Converts a Woo amount to integer Rials. IRT (Toman) is ×10; unknown currencies fail closed. */
	public static function to_irr( $amount, $currency ) {
		$currency = strtoupper( (string) $currency );
		if ( 'IRR' === $currency ) {
			return (int) round( (float) $amount );
		}
		if ( 'IRT' === $currency ) {
			return (int) round( (float) $amount * 10 );
		}
		return null;
	}

	public static function supports_currency( $currency ) {
		return in_array( strtoupper( (string) $currency ), array( 'IRR', 'IRT' ), true );
	}

	/**
	 * `KS` + base36(order) + two base36 attempt characters: 5–10 characters,
	 * always containing letters, and unique per attempt (Snapp error 1009).
	 */
	public static function transaction_id( $order_id, $attempt ) {
		$order_part = strtoupper( base_convert( (string) absint( $order_id ), 10, 36 ) );
		$attempt_part = str_pad( strtoupper( base_convert( (string) ( absint( $attempt ) % 1296 ), 10, 36 ) ), 2, '0', STR_PAD_LEFT );
		return substr( 'KS' . $order_part, 0, 8 ) . $attempt_part;
	}

	/** Coarse, network-free range guard used by is_available(); Snapp's eligibility call is authoritative. */
	public static function amount_in_configured_range( $amount_irr ) {
		$min = absint( getenv( 'SNAPPPAY_MIN_IRR' ) );
		$max = absint( getenv( 'SNAPPPAY_MAX_IRR' ) );
		return ( ! $min || $amount_irr >= $min ) && ( ! $max || $amount_irr <= $max );
	}

	/**
	 * Builds the token/update cart. Amount identities (doc §1.2):
	 *   cart.totalAmount = Σ(count × amount) + shipping + tax
	 *   amount           = Σ cart.totalAmount − discountAmount − externalSourceAmount
	 * `amount` must equal `$target_irr` (the order total by default). Small
	 * rounding differences are folded into the discount or a single-unit item;
	 * anything larger fails closed.
	 *
	 * @param array{target?: int, refunds?: bool} $options `refunds` subtracts refunded quantities, shipping and tax for update().
	 * @return array<string, mixed>|WP_Error
	 */
	public static function build_cart_payload( $order, array $options = array() ) {
		$currency = $order->get_currency();
		if ( ! self::supports_currency( $currency ) ) {
			return new WP_Error( 'kadochi_snapppay_currency', 'Snapp! Pay requires IRR or IRT.' );
		}
		$with_refunds = ! empty( $options['refunds'] );
		$items = array();
		$units = 0;
		foreach ( $order->get_items( 'line_item' ) as $item_id => $item ) {
			$quantity = (int) $item->get_quantity();
			if ( $quantity <= 0 ) {
				continue;
			}
			$unit = self::to_irr( (float) $item->get_subtotal() / $quantity, $currency );
			if ( $with_refunds && method_exists( $order, 'get_qty_refunded_for_item' ) ) {
				$quantity += (int) $order->get_qty_refunded_for_item( $item_id );
			}
			if ( $quantity <= 0 ) {
				continue;
			}
			$product_id = method_exists( $item, 'get_product_id' ) ? absint( $item->get_product_id() ) : 0;
			$items[] = array(
				'id' => $product_id ?: absint( $item_id ),
				'amount' => $unit,
				'category' => self::product_category( $product_id ),
				'count' => $quantity,
				'name' => self::safe_name( $item->get_name() ),
				'commissionType' => self::commission_type(),
			);
			$units += $quantity;
		}

		$discount = self::to_irr( (float) $order->get_discount_total(), $currency );
		$fee_total = 0;
		foreach ( method_exists( $order, 'get_fees' ) ? $order->get_fees() : array() as $fee ) {
			$fee_total += self::to_irr( (float) $fee->get_total(), $currency );
		}
		if ( $fee_total > 0 ) {
			$items[] = array( 'id' => absint( $order->get_id() ), 'amount' => $fee_total, 'category' => 'service', 'count' => 1, 'name' => 'هزینه خدمات', 'commissionType' => self::commission_type() );
			$units++;
		} elseif ( $fee_total < 0 ) {
			$discount += -$fee_total;
		}
		if ( empty( $items ) ) {
			return new WP_Error( 'kadochi_snapppay_empty_cart', 'The order has no payable items.' );
		}

		$shipping = self::to_irr( (float) $order->get_shipping_total(), $currency );
		$tax = self::to_irr( (float) $order->get_total_tax(), $currency );
		if ( $with_refunds ) {
			$shipping -= method_exists( $order, 'get_total_shipping_refunded' ) ? self::to_irr( (float) $order->get_total_shipping_refunded(), $currency ) : 0;
			$tax -= method_exists( $order, 'get_total_tax_refunded' ) ? self::to_irr( (float) $order->get_total_tax_refunded(), $currency ) : 0;
		}
		$shipping = max( 0, $shipping );
		$tax = max( 0, $tax );
		$target = isset( $options['target'] ) ? (int) $options['target'] : self::to_irr( (float) $order->get_total(), $currency );

		$items_total = 0;
		foreach ( $items as $line ) {
			$items_total += $line['count'] * $line['amount'];
		}
		$amount = $items_total + $shipping + $tax - $discount;
		$difference = $target - $amount;
		// Per-unit rounding can drift by up to half a Rial per unit plus each
		// converted total. A refund-driven update may lower the amount freely.
		$tolerance = 10 * ( $units + 4 );
		if ( $difference < 0 && ( $with_refunds || -$difference <= $tolerance ) ) {
			$discount += -$difference;
		} elseif ( $difference > 0 && $difference <= $tolerance ) {
			if ( $discount >= $difference ) {
				$discount -= $difference;
			} else {
				$single = null;
				foreach ( $items as $index => $line ) {
					if ( 1 === $line['count'] ) {
						$single = $index;
					}
				}
				if ( null !== $single ) {
					$items[ $single ]['amount'] += $difference;
				} else {
					$shipping += $difference;
				}
			}
		} elseif ( 0 !== $difference ) {
			return new WP_Error( 'kadochi_snapppay_payload_mismatch', 'The Snapp! Pay cart does not match the order total.', array( 'difference' => $difference ) );
		}

		$items_total = 0;
		foreach ( $items as $line ) {
			$items_total += $line['count'] * $line['amount'];
		}
		$cart_total = $items_total + $shipping + $tax;
		$amount = $cart_total - $discount;
		if ( $amount !== $target || $amount <= 0 ) {
			return new WP_Error( 'kadochi_snapppay_payload_mismatch', 'The Snapp! Pay cart does not match the order total.', array( 'difference' => $target - $amount ) );
		}

		return array(
			'amount' => $amount,
			'cartList' => array( array(
				'cartId' => absint( $order->get_id() ),
				'cartItems' => array_values( $items ),
				'isShipmentIncluded' => false,
				'isTaxIncluded' => false,
				'shippingAmount' => $shipping,
				'taxAmount' => $tax,
				'totalAmount' => $cart_total,
			) ),
			'discountAmount' => $discount,
			'externalSourceAmount' => 0,
		);
	}

	private static function product_category( $product_id ) {
		$terms = $product_id && function_exists( 'get_the_terms' ) ? get_the_terms( $product_id, 'product_cat' ) : false;
		if ( is_array( $terms ) && ! empty( $terms ) && isset( $terms[0]->name ) ) {
			return self::safe_name( $terms[0]->name, 100 );
		}
		return 'gift';
	}

	private static function commission_type() {
		$value = getenv( 'SNAPPPAY_COMMISSION_TYPE' );
		return is_string( $value ) && preg_match( '/^\d{1,6}$/', trim( $value ) ) ? (int) trim( $value ) : 100;
	}

	private static function safe_name( $value, $limit = 200 ) {
		$value = sanitize_text_field( (string) $value );
		$value = '' === $value ? 'item' : $value;
		return function_exists( 'mb_substr' ) ? mb_substr( $value, 0, $limit ) : substr( $value, 0, $limit );
	}

	/** Billing phone first, then the customer's verified account phone, as +98XXXXXXXXXX. */
	public static function order_mobile( $order ) {
		$phone = Kadochi_Core::normalize_phone( (string) $order->get_billing_phone() );
		if ( ! $phone && method_exists( $order, 'get_customer_id' ) && $order->get_customer_id() ) {
			$phone = Kadochi_Core::normalize_phone( (string) get_user_meta( $order->get_customer_id(), 'kadochi_phone', true ) );
		}
		return $phone;
	}

	/**
	 * Requests a payment token and returns Snapp's payment page URL.
	 *
	 * @return string|WP_Error WP_Error data carries `snapppayCode` for the BFF.
	 */
	public function start_payment( $order, $return_url ) {
		$order_id = absint( $order->get_id() );
		$log = array( 'order_id' => $order_id );
		if ( ! $this->is_configured() ) {
			return $this->start_error( 'configuration', $log );
		}
		$payload = self::build_cart_payload( $order );
		if ( is_wp_error( $payload ) ) {
			$this->log( 'payment_payload_mismatch', $log + array( 'reason' => $payload->get_error_code() ) );
			return $this->start_error( 'payload', $log );
		}
		$mobile = self::order_mobile( $order );
		if ( ! $mobile ) {
			return $this->start_error( 1005, $log );
		}
		$payload['mobile'] = $mobile;
		$payload['returnURL'] = $return_url;
		$forced = getenv( 'SNAPPPAY_FORCED_METHODS' );
		$forced = is_string( $forced ) ? Kadochi_SnappPay_Client::method_types( $forced ) : array();
		if ( $forced ) {
			$payload['forcedPaymentMethodTypes'] = $forced;
		}

		$this->core->gateway_attempt_started( $order );
		$result = null;
		$transaction_id = '';
		for ( $try = 0; $try < 2; $try++ ) {
			$sequence = absint( $order->get_meta( self::META_SEQUENCE, true ) ) + 1;
			$order->update_meta_data( self::META_SEQUENCE, $sequence );
			$order->save();
			$transaction_id = self::transaction_id( $order_id, $sequence );
			$payload['transactionId'] = $transaction_id;
			$result = $this->client->payment_token( $payload );
			if ( $result['ok'] || 1009 !== $result['errorCode'] ) {
				break;
			}
		}
		$data = is_array( $result['data'] ) ? $result['data'] : array();
		$token = isset( $data['paymentToken'] ) && is_string( $data['paymentToken'] ) ? $data['paymentToken'] : '';
		$page = isset( $data['paymentPageUrl'] ) ? $this->core->trusted_gateway_redirect( $data['paymentPageUrl'], self::GATEWAY_ID ) : false;
		if ( ! $result['ok'] || '' === $token || ! $page ) {
			$this->core->release_payment_attempt( $order, null, 'gateway_failure' );
			$code = $result['ok'] ? 'invalid_redirect' : ( in_array( $result['errorCode'], array( 'auth', 'configuration' ), true ) || 401 === $result['httpStatus'] ? 'configuration' : ( $result['errorCode'] ?: 'unavailable' ) );
			return $this->start_error( $code, $log + array( 'transaction_id' => $transaction_id ) );
		}

		$attempts = $this->attempts( $order );
		$attempts[ $transaction_id ] = array( 'token' => $token, 'amount' => $payload['amount'], 'createdAt' => time() );
		$attempts = array_slice( $attempts, -self::MAX_ATTEMPT_HISTORY, null, true );
		$order->update_meta_data( self::META_ATTEMPTS, $attempts );
		$order->update_meta_data( self::META_TOKEN, $token );
		$order->update_meta_data( self::META_TRANSACTION, $transaction_id );
		$order->update_meta_data( self::META_AMOUNT, $payload['amount'] );
		$order->add_meta_data( self::META_TRANSACTION_LOOKUP, $transaction_id, false );
		$order->update_meta_data( self::META_STATUS, 'PENDING' );
		$order->delete_meta_data( self::META_CALLBACK_OK );
		$order->save();
		if ( 'pending' !== $order->get_status() ) {
			$order->update_status( 'pending', sprintf( 'Snapp! Pay payment started (transaction %s).', $transaction_id ) );
		} else {
			$order->add_order_note( sprintf( 'Snapp! Pay payment started (transaction %s).', $transaction_id ) );
		}
		$this->core->gateway_attempt_redirect( $order, $page, self::PAYMENT_PAGE_TTL );
		$this->log( 'payment_authority_ready', $log + array( 'transaction_id' => $transaction_id ) );
		return $page;
	}

	private function start_error( $code, array $log ) {
		$this->log( 'payment_gateway_start_failed', $log + array( 'reason' => is_int( $code ) ? 'snapppay_' . $code : $code ) );
		return new WP_Error( 'kadochi_snapppay_start_failed', self::start_error_message( $code ), array( 'snapppayCode' => $code ) );
	}

	/** Customer-safe Persian notice. The trailing tag is parsed by the BFF, never shown verbatim. */
	public static function start_error_message( $code ) {
		return sprintf( 'شروع پرداخت با اسنپ‌پی انجام نشد. [snapppay:%s]', is_int( $code ) ? (string) $code : sanitize_key( (string) $code ) );
	}

	/** @return array<string, array{token: string, amount: int, createdAt: int}> */
	private function attempts( $order ) {
		$attempts = $order->get_meta( self::META_ATTEMPTS, true );
		return is_array( $attempts ) ? $attempts : array();
	}

	private function attempt( $order, $transaction_id ) {
		$attempts = $this->attempts( $order );
		if ( isset( $attempts[ $transaction_id ]['token'] ) ) {
			return $attempts[ $transaction_id ];
		}
		if ( (string) $order->get_meta( self::META_TRANSACTION, true ) === $transaction_id ) {
			return array( 'token' => (string) $order->get_meta( self::META_TOKEN, true ), 'amount' => absint( $order->get_meta( self::META_AMOUNT, true ) ), 'createdAt' => 0 );
		}
		return null;
	}

	public function find_order_by_transaction( $transaction_id ) {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return null;
		}
		$orders = wc_get_orders( array(
			'limit' => 1,
			'payment_method' => self::GATEWAY_ID,
			'status' => array_keys( wc_get_order_statuses() ),
			'meta_key' => self::META_TRANSACTION_LOOKUP,
			'meta_value' => $transaction_id,
		) );
		return empty( $orders ) ? null : $orders[0];
	}

	/**
	 * Handles Snapp's browser form POST and returns the frontend URL to send the
	 * customer to. Idempotent against repeated callbacks.
	 *
	 * @param array<string, mixed> $input Unslashed POST fields.
	 */
	public function handle_callback( array $input ) {
		$transaction_id = isset( $input['transactionId'] ) ? sanitize_text_field( (string) $input['transactionId'] ) : '';
		$state = isset( $input['state'] ) ? strtoupper( sanitize_text_field( (string) $input['state'] ) ) : '';
		$amount = isset( $input['amount'] ) && is_numeric( $input['amount'] ) ? (int) $input['amount'] : null;
		$order = preg_match( '/^[A-Za-z0-9]{5,10}$/', $transaction_id ) ? call_user_func( $this->order_finder, $transaction_id ) : null;
		$attempt = $order ? $this->attempt( $order, $transaction_id ) : null;
		if ( ! $order || ! $attempt || '' === $attempt['token'] ) {
			$this->log( 'payment_callback_unmatched', array( 'transaction_id' => $transaction_id ? substr( $transaction_id, 0, 10 ) : '' ) );
			return $this->core->frontend_checkout_result_url( 'failure', null );
		}
		$log = array( 'order_id' => absint( $order->get_id() ), 'transaction_id' => $transaction_id, 'state' => $state );
		$this->log( 'payment_callback_received', $log );

		if ( $order->is_paid() ) {
			// A second paid attempt for an already-paid order is refunded; a
			// repeated callback for the settled attempt is simply acknowledged.
			if ( 'OK' === $state && (string) $order->get_meta( self::META_SETTLED_TRANSACTION, true ) !== $transaction_id ) {
				$this->client->revert( $attempt['token'] );
				$order->add_order_note( sprintf( 'Snapp! Pay transaction %s reverted: the order was already paid.', $transaction_id ) );
			}
			return $this->core->frontend_checkout_result_url( 'return', $order );
		}

		if ( ! $this->acquire_lock( $order ) ) {
			$this->log( 'payment_finalize_locked', $log );
			return $this->core->frontend_checkout_result_url( 'return', $order );
		}
		try {
			if ( 'OK' !== $state ) {
				$this->mark_failed( $order, $transaction_id, sprintf( 'Snapp! Pay reported state %s for transaction %s.', $state ?: 'EMPTY', $transaction_id ) );
				if ( self::env_flag( 'SNAPPPAY_REVERT_ON_FAILED' ) ) {
					$this->client->revert( $attempt['token'] );
				}
				return $this->core->frontend_checkout_result_url( 'failure', $order );
			}
			$order->update_meta_data( self::META_CALLBACK_OK, $transaction_id );
			$order->save();
			if ( null === $amount || $amount !== (int) $attempt['amount'] ) {
				$this->log( 'payment_callback_amount_mismatch', $log );
				$status = $this->client->status( $attempt['token'] );
				$confirmed = $status['ok'] && is_array( $status['data'] ) && isset( $status['data']['amount'] ) && (int) $status['data']['amount'] === (int) $attempt['amount'];
				if ( ! $confirmed ) {
					$this->record_outcome( $order, $transaction_id, 'unknown', 'Snapp! Pay callback amount did not match; left for reconciliation.' );
					return $this->core->frontend_checkout_result_url( 'return', $order );
				}
			}
			$outcome = $this->finalize( $order, $transaction_id, $attempt['token'] );
			return $this->core->frontend_checkout_result_url( 'failed' === $outcome ? 'failure' : 'return', $order );
		} finally {
			$this->release_lock( $order );
		}
	}

	/**
	 * Runs the documented verify → settle state machine for one attempt.
	 * Verify is sent at most once; later runs resume from Snapp's status.
	 *
	 * @return string paid|failed|unknown
	 */
	public function finalize( $order, $transaction_id, $token ) {
		if ( ! $this->can_fulfil( $order ) ) {
			$this->client->revert( $token );
			$order->add_order_note( sprintf( 'Snapp! Pay transaction %s reverted: the order can no longer be fulfilled.', $transaction_id ) );
			if ( ! $order->is_paid() ) {
				$order->update_meta_data( self::META_STATUS, 'REVERT' );
				$order->save();
			}
			return 'failed';
		}
		$phase = (string) $order->get_meta( self::META_STATUS, true );
		if ( in_array( $phase, array( 'VERIFY_SENT', 'VERIFY', 'UNKNOWN' ), true ) ) {
			return $this->resume_from_status( $order, $transaction_id, $token, true );
		}
		$order->update_meta_data( self::META_STATUS, 'VERIFY_SENT' );
		$order->save();
		$verify = $this->client->verify( $token );
		if ( $verify['ok'] ) {
			return $this->settle( $order, $transaction_id, $token );
		}
		// Timeouts, 5xx, and 4xx wrong-state/bad-token answers are all resolved
		// through status; PENDING after a transport failure gets one more verify.
		return $this->resume_from_status( $order, $transaction_id, $token, $verify['timedOut'] || 0 === $verify['httpStatus'] || $verify['httpStatus'] >= 500 );
	}

	private function resume_from_status( $order, $transaction_id, $token, $may_verify, $status = null ) {
		$status = null === $status ? $this->payment_status( $token ) : $status;
		if ( 'SETTLE' === $status ) {
			return $this->record_outcome( $order, $transaction_id, 'paid', 'Snapp! Pay reports the payment as settled.' );
		}
		if ( 'VERIFY' === $status ) {
			return $this->settle( $order, $transaction_id, $token );
		}
		if ( 'PENDING' === $status && $may_verify ) {
			$verify = $this->client->verify( $token );
			return $verify['ok'] ? $this->settle( $order, $transaction_id, $token ) : $this->record_outcome( $order, $transaction_id, 'unknown', 'Snapp! Pay verify did not complete; left for reconciliation.' );
		}
		if ( in_array( $status, array( 'REVERT', 'CANCEL' ), true ) ) {
			return $this->record_outcome( $order, $transaction_id, 'failed', sprintf( 'Snapp! Pay reports status %s.', $status ) );
		}
		return $this->record_outcome( $order, $transaction_id, 'unknown', sprintf( 'Snapp! Pay status is %s; left for reconciliation.', $status ?: 'unavailable' ) );
	}

	private function settle( $order, $transaction_id, $token ) {
		$order->update_meta_data( self::META_STATUS, 'VERIFY' );
		$order->save();
		for ( $try = 0; $try < 2; $try++ ) {
			$settle = $this->client->settle( $token );
			if ( $settle['ok'] ) {
				return $this->record_outcome( $order, $transaction_id, 'paid', 'Snapp! Pay payment verified and settled.' );
			}
			$status = $this->payment_status( $token );
			if ( 'SETTLE' === $status ) {
				return $this->record_outcome( $order, $transaction_id, 'paid', 'Snapp! Pay payment settled.' );
			}
			if ( in_array( $status, array( 'REVERT', 'CANCEL' ), true ) ) {
				return $this->record_outcome( $order, $transaction_id, 'failed', sprintf( 'Snapp! Pay reports status %s after verify.', $status ) );
			}
			if ( 'VERIFY' !== $status ) {
				break;
			}
		}
		return $this->record_outcome( $order, $transaction_id, 'unknown', 'Snapp! Pay settle did not complete; left for reconciliation.' );
	}

	private function payment_status( $token ) {
		$result = $this->client->status( $token );
		$status = $result['ok'] && is_array( $result['data'] ) && isset( $result['data']['status'] ) ? strtoupper( sanitize_key( (string) $result['data']['status'] ) ) : '';
		return in_array( $status, array( 'PENDING', 'VERIFY', 'SETTLE', 'REVERT', 'CANCEL' ), true ) ? $status : '';
	}

	private function record_outcome( $order, $transaction_id, $outcome, $note ) {
		$order->update_meta_data( self::META_LAST_SYNC, time() );
		if ( 'paid' === $outcome ) {
			$order->update_meta_data( self::META_STATUS, 'SETTLE' );
			$order->update_meta_data( self::META_SETTLED_TRANSACTION, $transaction_id );
			$attempt = $this->attempt( $order, $transaction_id );
			if ( $attempt ) {
				$order->update_meta_data( self::META_TOKEN, $attempt['token'] );
				$order->update_meta_data( self::META_TRANSACTION, $transaction_id );
				$order->update_meta_data( self::META_AMOUNT, $attempt['amount'] );
			}
			$order->save();
			$order->add_order_note( $note );
			if ( ! $order->is_paid() ) {
				$order->payment_complete( $transaction_id );
			}
			$this->log( 'payment_settled', array( 'order_id' => absint( $order->get_id() ), 'transaction_id' => $transaction_id ) );
			return 'paid';
		}
		if ( 'failed' === $outcome ) {
			$this->mark_failed( $order, $transaction_id, $note );
			return 'failed';
		}
		$order->update_meta_data( self::META_STATUS, 'UNKNOWN' );
		$order->save();
		$order->add_order_note( $note );
		$this->log( 'payment_finalize_unknown', array( 'order_id' => absint( $order->get_id() ), 'transaction_id' => $transaction_id ) );
		return 'unknown';
	}

	private function mark_failed( $order, $transaction_id, $note ) {
		$order->update_meta_data( self::META_STATUS, 'FAILED' );
		$order->update_meta_data( self::META_LAST_SYNC, time() );
		$order->save();
		if ( ! $order->is_paid() ) {
			$order->update_status( 'failed', $note );
		}
		$this->core->release_payment_attempt( $order, null, 'cancelled' );
		$this->log( 'payment_failed', array( 'order_id' => absint( $order->get_id() ), 'transaction_id' => $transaction_id ) );
	}

	private function can_fulfil( $order ) {
		return ! $order->is_paid() && in_array( sanitize_key( $order->get_status() ), array( 'pending', 'pending-payment', 'failed', 'on-hold' ), true );
	}

	/**
	 * Reconciles one order from Snapp's status (cron, admin sync, and result-page
	 * reads). PENDING is verified only after an OK callback was received.
	 *
	 * @return string paid|failed|unknown|skipped|locked
	 */
	public function reconcile( $order ) {
		if ( ! $order || $order->is_paid() || self::GATEWAY_ID !== $order->get_payment_method() ) {
			return 'skipped';
		}
		$transaction_id = (string) $order->get_meta( self::META_TRANSACTION, true );
		$attempt = $transaction_id ? $this->attempt( $order, $transaction_id ) : null;
		if ( ! $attempt || '' === $attempt['token'] || in_array( (string) $order->get_meta( self::META_STATUS, true ), self::FINAL_STATUSES, true ) ) {
			return 'skipped';
		}
		if ( ! $this->acquire_lock( $order ) ) {
			return 'locked';
		}
		try {
			$callback_ok = (string) $order->get_meta( self::META_CALLBACK_OK, true ) === $transaction_id;
			$status = $this->payment_status( $attempt['token'] );
			if ( 'PENDING' === $status && ! $callback_ok ) {
				$order->update_meta_data( self::META_LAST_SYNC, time() );
				$order->save();
				return 'unknown';
			}
			if ( '' === $status && ! $callback_ok ) {
				return 'unknown';
			}
			if ( 'VERIFY' === $status || 'SETTLE' === $status || in_array( $status, array( 'REVERT', 'CANCEL' ), true ) ) {
				return $this->resume_from_status( $order, $transaction_id, $attempt['token'], false, $status );
			}
			return $this->finalize( $order, $transaction_id, $attempt['token'] );
		} finally {
			$this->release_lock( $order );
		}
	}

	/** Orders that may still need a verify/settle: recent, unpaid, with a non-final Snapp status. */
	public function reconcile_due_orders() {
		if ( ! function_exists( 'wc_get_orders' ) ) {
			return;
		}
		$orders = wc_get_orders( array(
			'limit' => 50,
			'payment_method' => self::GATEWAY_ID,
			'status' => array( 'pending', 'failed' ),
			'date_created' => ( time() - 2 * DAY_IN_SECONDS ) . '...' . ( time() - 3 * MINUTE_IN_SECONDS ),
			'meta_query' => array( array( 'key' => self::META_TOKEN, 'compare' => 'EXISTS' ) ),
		) );
		foreach ( $orders as $order ) {
			$this->reconcile( $order );
		}
	}

	/**
	 * Full refunds cancel a settled payment; partial refunds send the reduced
	 * cart through update(). Woo's refund UI supplies the admin confirmation.
	 *
	 * @return true|WP_Error
	 */
	public function refund( $order, $amount, $reason = '' ) {
		$transaction_id = (string) $order->get_meta( self::META_SETTLED_TRANSACTION, true );
		$attempt = $transaction_id ? $this->attempt( $order, $transaction_id ) : null;
		if ( ! $attempt || '' === $attempt['token'] || 'SETTLE' !== (string) $order->get_meta( self::META_STATUS, true ) ) {
			return new WP_Error( 'kadochi_snapppay_refund_unavailable', 'Only a settled Snapp! Pay payment can be refunded.' );
		}
		$currency = $order->get_currency();
		$remaining = self::to_irr( (float) $order->get_total() - (float) $order->get_total_refunded(), $currency );
		$log = array( 'order_id' => absint( $order->get_id() ), 'transaction_id' => $transaction_id );
		if ( $remaining <= 0 ) {
			$result = $this->client->cancel( $attempt['token'] );
			if ( ! $result['ok'] ) {
				$order->add_order_note( sprintf( 'Snapp! Pay cancel failed (error %s).', $result['errorCode'] ?: $result['httpStatus'] ) );
				$this->log( 'payment_cancel_failed', $log + array( 'error_code' => $result['errorCode'] ) );
				return new WP_Error( 'kadochi_snapppay_cancel_failed', 'Snapp! Pay could not cancel this payment. No refund was made.' );
			}
			$order->update_meta_data( self::META_STATUS, 'CANCEL' );
			$order->save();
			$order->add_order_note( 'Snapp! Pay payment cancelled in full.' . ( $reason ? ' ' . sanitize_text_field( $reason ) : '' ) );
			$this->log( 'payment_cancelled', $log );
			return true;
		}
		if ( $remaining > (int) $attempt['amount'] ) {
			return new WP_Error( 'kadochi_snapppay_update_amount', 'The updated amount cannot exceed the original Snapp! Pay amount.' );
		}
		$payload = self::build_cart_payload( $order, array( 'target' => $remaining, 'refunds' => true ) );
		if ( is_wp_error( $payload ) ) {
			$order->add_order_note( 'Snapp! Pay update was not sent: the remaining cart does not match the refunded total.' );
			return $payload;
		}
		$payload['mobile'] = self::order_mobile( $order );
		$payload['paymentToken'] = $attempt['token'];
		$result = $this->client->update( $payload );
		if ( ! $result['ok'] ) {
			$code = $result['errorCode'];
			$message = 1078 === $code
				? 'The customer used a Snapp! Pay discount, so this payment cannot be partially updated. Refund the full order to cancel it instead.'
				: ( 1042 === $code ? 'Snapp! Pay rejected the update because the amount is too high.' : 'Snapp! Pay could not update this payment. No refund was made.' );
			$order->add_order_note( sprintf( 'Snapp! Pay update failed (error %s).', $code ?: $result['httpStatus'] ) );
			$this->log( 'payment_update_failed', $log + array( 'error_code' => $code ) );
			return new WP_Error( 'kadochi_snapppay_update_failed', $message );
		}
		$order->update_meta_data( self::META_AMOUNT, $remaining );
		$order->save();
		$order->add_order_note( sprintf( 'Snapp! Pay payment updated to %d IRR.', $remaining ) . ( $reason ? ' ' . sanitize_text_field( $reason ) : '' ) );
		$this->log( 'payment_updated', $log );
		return true;
	}

	/** Per-order finalisation lock; a lock older than two minutes is considered abandoned. */
	private function acquire_lock( $order ) {
		$key = 'kadochi_snapppay_finalize_' . absint( $order->get_id() );
		if ( add_option( $key, time(), '', 'no' ) ) {
			return true;
		}
		$started = absint( get_option( $key, 0 ) );
		if ( $started && $started > time() - self::FINALIZE_LOCK_SECONDS ) {
			return false;
		}
		delete_option( $key );
		return add_option( $key, time(), '', 'no' );
	}

	private function release_lock( $order ) {
		delete_option( 'kadochi_snapppay_finalize_' . absint( $order->get_id() ) );
	}

	private static function env_flag( $name ) {
		$value = getenv( $name );
		return is_string( $value ) && in_array( strtolower( trim( $value ) ), array( '1', 'true', 'yes', 'on' ), true );
	}

	private function log( $event, array $context ) {
		$this->core->payment_log( $event, $context, 'snapppay' );
	}
}
