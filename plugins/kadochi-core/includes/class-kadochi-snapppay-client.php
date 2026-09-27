<?php
/** Thin, log-safe HTTP client for the Snapp! Pay online-merchant API. */

defined( 'ABSPATH' ) || exit;

final class Kadochi_SnappPay_Client {
	const TOKEN_TRANSIENT = 'kadochi_snapppay_access_token';
	const DEFAULT_TIMEOUT = 15;
	const VERIFY_TIMEOUT = 30;
	const BUSY_RETRY_DELAYS = array( 2, 4, 6 );

	/** @var array<string, mixed>|null */
	private $config;
	/** @var callable */
	private $transport;
	/** @var callable */
	private $sleeper;
	/** @var callable|null */
	private $logger;

	/**
	 * @param array<string, mixed>|null $config    Defaults to the SNAPPPAY_* environment.
	 * @param callable|null             $transport fn( string $method, string $url, array $args ): array|WP_Error, shaped like wp_remote_request().
	 * @param callable|null             $logger    fn( string $event, array $context ).
	 */
	public function __construct( $config = null, $transport = null, $logger = null, $sleeper = null ) {
		$this->config = null === $config ? self::config() : $config;
		$this->transport = $transport ?: function ( $method, $url, $args ) {
			return wp_remote_request( $url, array_merge( $args, array( 'method' => $method ) ) );
		};
		$this->logger = $logger;
		$this->sleeper = $sleeper ?: 'sleep';
	}

	/** Reads credentials only from the server environment; returns null when any required value is missing. */
	public static function config() {
		$read = function ( $name ) {
			$value = getenv( $name );
			return is_string( $value ) ? trim( $value ) : '';
		};
		$base_url = $read( 'SNAPPPAY_BASE_URL' );
		$parts = $base_url ? wp_parse_url( $base_url ) : false;
		$config = array(
			'baseUrl' => is_array( $parts ) && ! empty( $parts['host'] ) && isset( $parts['scheme'] ) && 'https' === strtolower( $parts['scheme'] ) ? untrailingslashit( $base_url ) : '',
			'clientId' => $read( 'SNAPPPAY_CLIENT_ID' ),
			'clientSecret' => $read( 'SNAPPPAY_CLIENT_SECRET' ),
			'username' => $read( 'SNAPPPAY_USERNAME' ),
			'password' => $read( 'SNAPPPAY_PASSWORD' ),
			'timeout' => max( 5, min( 30, absint( $read( 'SNAPPPAY_TIMEOUT' ) ) ?: self::DEFAULT_TIMEOUT ) ),
			'venture' => $read( 'SNAPPPAY_VENTURE' ),
		);
		foreach ( array( 'baseUrl', 'clientId', 'clientSecret', 'username', 'password' ) as $required ) {
			if ( '' === $config[ $required ] ) {
				return null;
			}
		}
		return $config;
	}

	public function is_configured() {
		return is_array( $this->config );
	}

	/** Host of the configured API, which also serves the staging payment page. */
	public function base_host() {
		$host = $this->is_configured() ? wp_parse_url( $this->config['baseUrl'], PHP_URL_HOST ) : '';
		return is_string( $host ) ? strtolower( $host ) : '';
	}

	/** @return array{eligible: bool, title: string, description: string} */
	public function eligible( $amount_irr ) {
		$amount_irr = (int) $amount_irr;
		$query = array( 'amount' => $amount_irr );
		$types = getenv( 'SNAPPPAY_FORCED_METHODS' );
		if ( is_string( $types ) && '' !== trim( $types ) ) {
			$query['paymentMethodTypes'] = implode( ',', self::method_types( $types ) );
		}
		$result = $this->request( 'GET', '/api/online/offer/v1/eligible?' . http_build_query( $query ), null, 'eligible' );
		$data = $result['data'];
		if ( ! $result['ok'] || ! is_array( $data ) || empty( $data['eligible'] ) ) {
			return array( 'eligible' => false, 'title' => '', 'description' => '' );
		}
		return array(
			'eligible' => true,
			'title' => isset( $data['title_message'] ) ? sanitize_text_field( (string) $data['title_message'] ) : '',
			'description' => isset( $data['description'] ) ? sanitize_text_field( (string) $data['description'] ) : '',
		);
	}

	public function payment_token( array $payload ) {
		return $this->request( 'POST', '/api/online/payment/v1/token', $payload, 'token' );
	}

	public function verify( $token ) {
		return $this->request( 'POST', '/api/online/payment/v1/verify', array( 'paymentToken' => (string) $token ), 'verify', self::VERIFY_TIMEOUT );
	}

	public function settle( $token ) {
		return $this->request( 'POST', '/api/online/payment/v1/settle', array( 'paymentToken' => (string) $token ), 'settle' );
	}

	public function status( $token ) {
		return $this->request( 'GET', '/api/online/payment/v1/status?' . http_build_query( array( 'paymentToken' => (string) $token ) ), null, 'status' );
	}

	public function revert( $token ) {
		return $this->request( 'POST', '/api/online/payment/v1/revert', array( 'paymentToken' => (string) $token ), 'revert' );
	}

	public function cancel( $token ) {
		return $this->request( 'POST', '/api/online/payment/v1/cancel', array( 'paymentToken' => (string) $token ), 'cancel' );
	}

	public function update( array $payload ) {
		return $this->request( 'POST', '/api/online/payment/v1/update', $payload, 'update' );
	}

	/** @return string[] Only Snapp's documented payment-method type names. */
	public static function method_types( $value ) {
		$types = array_map( 'strtoupper', array_map( 'trim', explode( ',', (string) $value ) ) );
		return array_values( array_intersect( array_unique( $types ), array( 'INSTALLMENT', 'POSTPAID', 'FINANCING' ) ) );
	}

	/** OAuth password grant, cached until two minutes before expiry. */
	private function access_token( $force_refresh = false ) {
		if ( ! $force_refresh ) {
			$cached = get_transient( self::TOKEN_TRANSIENT );
			if ( is_string( $cached ) && '' !== $cached ) {
				return $cached;
			}
		}
		delete_transient( self::TOKEN_TRANSIENT );
		$response = $this->send( 'POST', '/api/online/v1/oauth/token', array(
			'headers' => array(
				'Authorization' => 'Basic ' . base64_encode( $this->config['clientId'] . ':' . $this->config['clientSecret'] ),
				'Content-Type' => 'application/x-www-form-urlencoded',
				'Accept' => 'application/json',
			),
			'body' => http_build_query( array(
				'grant_type' => 'password',
				'scope' => 'online-merchant',
				'username' => $this->config['username'],
				'password' => $this->config['password'],
			) ),
		), $this->config['timeout'] );
		$body = is_wp_error( $response ) ? null : json_decode( (string) wp_remote_retrieve_body( $response ), true );
		$token = is_array( $body ) && isset( $body['access_token'] ) && is_string( $body['access_token'] ) ? $body['access_token'] : '';
		if ( '' === $token ) {
			$this->log( 'snapppay_auth_failed', array( 'http_status' => is_wp_error( $response ) ? 0 : (int) wp_remote_retrieve_response_code( $response ) ) );
			return null;
		}
		$ttl = isset( $body['expires_in'] ) ? absint( $body['expires_in'] ) : 3600;
		set_transient( self::TOKEN_TRANSIENT, $token, max( 60, $ttl - 120 ) );
		return $token;
	}

	/**
	 * Sends one API call and decodes Snapp's envelope. Retries once after a 401
	 * with a fresh token and up to three times on 429/1053 (ongoing transition).
	 *
	 * @return array{ok: bool, httpStatus: int, errorCode: int|string|null, message: string, data: mixed, timedOut: bool}
	 */
	public function request( $method, $path, $body, $operation, $timeout = null ) {
		if ( ! $this->is_configured() ) {
			return self::result( false, 0, 'configuration', '', null, false );
		}
		$timeout = $timeout ?: $this->config['timeout'];
		$started_at = microtime( true );
		$auth_retried = false;
		$refresh_token = false;
		$busy_retries = 0;
		while ( true ) {
			$token = $this->access_token( $refresh_token );
			$refresh_token = false;
			if ( ! $token ) {
				$result = self::result( false, 401, 'auth', '', null, false );
				break;
			}
			$headers = array( 'Authorization' => 'Bearer ' . $token, 'Accept' => 'application/json' );
			if ( null !== $body ) {
				$headers['Content-Type'] = 'application/json';
			}
			if ( '' !== $this->config['venture'] ) {
				$headers['venture'] = $this->config['venture'];
			}
			$args = array( 'headers' => $headers );
			if ( null !== $body ) {
				$args['body'] = wp_json_encode( $body );
			}
			$response = $this->send( $method, $path, $args, $timeout );
			$result = self::decode( $response );
			if ( 401 === $result['httpStatus'] && ! $auth_retried ) {
				$auth_retried = true;
				$refresh_token = true;
				continue;
			}
			$busy = 429 === $result['httpStatus'] || 1053 === $result['errorCode'];
			if ( $busy && $busy_retries < count( self::BUSY_RETRY_DELAYS ) ) {
				call_user_func( $this->sleeper, self::BUSY_RETRY_DELAYS[ $busy_retries++ ] );
				continue;
			}
			break;
		}
		$this->log( 'snapppay_' . sanitize_key( $operation ), array(
			'ok' => $result['ok'],
			'http_status' => $result['httpStatus'],
			'error_code' => $result['errorCode'],
			'timed_out' => $result['timedOut'],
			'duration_ms' => max( 0, (int) round( ( microtime( true ) - $started_at ) * 1000 ) ),
		) );
		return $result;
	}

	private function send( $method, $path, array $args, $timeout ) {
		$args['timeout'] = $timeout;
		$args['redirection'] = 0;
		return call_user_func( $this->transport, $method, $this->config['baseUrl'] . $path, $args );
	}

	private static function decode( $response ) {
		if ( is_wp_error( $response ) ) {
			$message = strtolower( $response->get_error_message() );
			$timed_out = false !== strpos( $message, 'timed out' ) || false !== strpos( $message, 'timeout' );
			return self::result( false, 0, $timed_out ? 'timeout' : 'network', '', null, $timed_out );
		}
		$status = (int) wp_remote_retrieve_response_code( $response );
		$body = json_decode( (string) wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $body ) ) {
			return self::result( false, $status, $status >= 200 && $status < 300 ? 'malformed' : null, '', null, false );
		}
		if ( ! empty( $body['successful'] ) && $status >= 200 && $status < 300 ) {
			return self::result( true, $status, null, '', isset( $body['response'] ) ? $body['response'] : null, false );
		}
		$error = isset( $body['errorData'] ) && is_array( $body['errorData'] ) ? $body['errorData'] : array();
		$code = isset( $error['errorCode'] ) ? $error['errorCode'] : null;
		$code = is_numeric( $code ) ? (int) $code : ( is_string( $code ) ? sanitize_key( $code ) : null );
		$message = isset( $error['message'] ) && is_string( $error['message'] ) ? sanitize_text_field( $error['message'] ) : '';
		return self::result( false, $status, $code, $message, isset( $error['data'] ) ? $error['data'] : null, false );
	}

	private static function result( $ok, $status, $code, $message, $data, $timed_out ) {
		return array( 'ok' => (bool) $ok, 'httpStatus' => (int) $status, 'errorCode' => $code, 'message' => $message, 'data' => $data, 'timedOut' => (bool) $timed_out );
	}

	private function log( $event, array $context ) {
		if ( $this->logger ) {
			call_user_func( $this->logger, $event, $context );
		}
	}
}
