<?php
/** @group snapppay */
final class Kadochi_SnappPay_Client_Test extends WP_UnitTestCase {
	private function client( &$calls, &$logs, array $responses ) {
		delete_transient( Kadochi_SnappPay_Client::TOKEN_TRANSIENT );
		return new Kadochi_SnappPay_Client(
			array( 'baseUrl' => 'https://snapp.example', 'clientId' => 'client', 'clientSecret' => 'secret', 'username' => 'merchant', 'password' => 'password', 'timeout' => 15, 'venture' => '' ),
			function ( $method, $url, $args ) use ( &$calls, &$responses ) {
				$calls[] = array( $method, $url, $args );
				if ( false !== strpos( $url, '/oauth/token' ) ) {
					return array( 'response' => array( 'code' => 200 ), 'body' => wp_json_encode( array( 'access_token' => 'secret-access-token', 'expires_in' => 3600 ) ) );
				}
				return array_shift( $responses );
			},
			function ( $event, $context ) use ( &$logs ) { $logs[] = array( $event, $context ); },
			function () {}
		);
	}

	private function response( $status, array $body ) {
		return array( 'response' => array( 'code' => $status ), 'body' => wp_json_encode( $body ) );
	}

	public function test_get_payment_status_uses_documented_get_query_and_bearer_auth() {
		$calls = $logs = array();
		$data = array( 'transactionId' => 'KS12301', 'status' => 'SETTLE', 'amount' => 123000 );
		$client = $this->client( $calls, $logs, array( $this->response( 200, array( 'successful' => true, 'response' => $data ) ) ) );
		$result = $client->status( 'payment/token+secret' );
		$this->assertTrue( $result['ok'] );
		$this->assertSame( $data, $result['data'] );
		$this->assertSame( 'GET', $calls[1][0] );
		$this->assertSame( 'https://snapp.example/api/online/payment/v1/status?paymentToken=payment%2Ftoken%2Bsecret', $calls[1][1] );
		$this->assertSame( 'Bearer secret-access-token', $calls[1][2]['headers']['Authorization'] );
		$this->assertArrayNotHasKey( 'body', $calls[1][2] );
		$this->assertSame( 0, $calls[1][2]['redirection'] );
		$this->assertStringNotContainsString( 'secret', wp_json_encode( $logs ) );
		$this->assertStringNotContainsString( 'paymentToken', wp_json_encode( $logs ) );
	}

	public function test_status_refreshes_expired_auth_once_and_retries_busy_transition() {
		$calls = $logs = array();
		$client = $this->client( $calls, $logs, array(
			$this->response( 401, array( 'successful' => false ) ),
			$this->response( 429, array( 'successful' => false, 'errorData' => array( 'errorCode' => 1053 ) ) ),
			$this->response( 200, array( 'successful' => true, 'response' => array( 'transactionId' => 'KS12301', 'status' => 'PENDING', 'amount' => 100 ) ) ),
		) );
		$this->assertTrue( $client->status( 'secret-token' )['ok'] );
		$this->assertCount( 5, $calls ); // Two OAuth calls, three status calls.
		$this->assertStringNotContainsString( 'secret', wp_json_encode( $logs ) );
	}

	public function test_status_errors_and_false_envelopes_do_not_become_success() {
		foreach ( array(
			new WP_Error( 'http_request_failed', 'Request timed out' ),
			$this->response( 403, array( 'successful' => false, 'errorData' => array( 'errorCode' => 1051 ) ) ),
			$this->response( 200, array( 'successful' => 'false', 'response' => array( 'status' => 'SETTLE' ) ) ),
			array( 'response' => array( 'code' => 200 ), 'body' => '<html>error</html>' ),
		) as $response ) {
			$calls = $logs = array();
			$client = $this->client( $calls, $logs, array( $response ) );
			$this->assertFalse( $client->status( 'secret-token' )['ok'] );
			$this->assertStringNotContainsString( 'secret', wp_json_encode( $logs ) );
		}
	}
}
