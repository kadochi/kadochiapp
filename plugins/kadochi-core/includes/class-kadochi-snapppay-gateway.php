<?php
/** WooCommerce gateway shell for Snapp! Pay; lifecycle logic lives in Kadochi_SnappPay. */

defined( 'ABSPATH' ) || exit;

class Kadochi_SnappPay_Gateway extends WC_Payment_Gateway {
	public function __construct() {
		$this->id = Kadochi_SnappPay::GATEWAY_ID;
		$this->method_title = Kadochi_SnappPay::TITLE;
		$this->method_description = __( 'Snapp! Pay buy-now-pay-later. Credentials come from the SNAPPPAY_* server environment; refunds cancel or update the settled payment.', 'kadochi-core' );
		$this->has_fields = false;
		$this->supports = array( 'products', 'refunds' );
		$this->init_form_fields();
		$this->init_settings();
		$this->title = $this->get_option( 'title', Kadochi_SnappPay::TITLE );
		$this->description = '';
		add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
	}

	public function init_form_fields() {
		$this->form_fields = array(
			'enabled' => array( 'title' => __( 'Enable/Disable', 'kadochi-core' ), 'type' => 'checkbox', 'label' => __( 'Enable Snapp! Pay', 'kadochi-core' ), 'default' => 'no' ),
			'title' => array( 'title' => __( 'Title', 'kadochi-core' ), 'type' => 'text', 'default' => Kadochi_SnappPay::TITLE ),
		);
	}

	private function service() {
		return Kadochi_Core::instance()->snapppay();
	}

	/** Network-free: configuration, currency, and the coarse configured amount range only. */
	public function is_available() {
		if ( ! parent::is_available() || ! $this->service()->is_configured() || ! Kadochi_SnappPay::supports_currency( get_woocommerce_currency() ) ) {
			return false;
		}
		if ( function_exists( 'WC' ) && WC()->cart ) {
			$amount = Kadochi_SnappPay::to_irr( (float) WC()->cart->get_total( 'edit' ), get_woocommerce_currency() );
			return null !== $amount && Kadochi_SnappPay::amount_in_configured_range( $amount );
		}
		return true;
	}

	public function process_payment( $order_id ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			throw new Exception( Kadochi_SnappPay::start_error_message( 'order' ) );
		}
		$redirect = $this->service()->start_payment( $order, WC()->api_request_url( Kadochi_SnappPay::GATEWAY_ID ) );
		if ( is_wp_error( $redirect ) ) {
			throw new Exception( $redirect->get_error_message() );
		}
		return array( 'result' => 'success', 'redirect' => $redirect );
	}

	public function process_refund( $order_id, $amount = null, $reason = '' ) {
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			return new WP_Error( 'kadochi_snapppay_refund_unavailable', __( 'Order not found.', 'kadochi-core' ) );
		}
		return $this->service()->refund( $order, $amount, $reason );
	}
}
