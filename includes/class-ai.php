<?php
/**
 * The guide's AI layer, served from this site.
 *
 * Inside the claude.ai preview the guide talks to Claude directly. On a real
 * site there is no such bridge, so without this the AI features simply never
 * appear: no reading of a customer e-mail or drawing, no summary, no follow-up
 * questions. This endpoint is that bridge.
 *
 * What it is NOT: it does not decide anything. Speeds, feeds and item numbers
 * come from the guide's own tables. The model reads language and explains; if
 * it ever starts producing figures, the guide becomes confident and wrong.
 *
 * The API key is read from a constant, never the database — a key in the
 * database ends up in every backup and every export. In wp-config.php:
 *
 *     define( 'NUFG_CLAUDE_API_KEY', 'sk-ant-...' );
 *     define( 'NUFG_CLAUDE_MODEL', 'claude-haiku-5-5' );   // optional
 *
 * With no key the endpoint answers "unconfigured" and the guide carries on with
 * its offline model. Nothing breaks and the visitor sees no error.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class NUFG_AI {

	const ENDPOINT       = 'https://api.anthropic.com/v1/messages';
	const API_VERSION    = '2023-06-01';
	const DEFAULT_MODEL  = 'claude-haiku-5-5';
	const MAX_PROMPT     = 24000;   // characters
	const MAX_IMAGES     = 3;
	const MAX_IMAGE_B64  = 1600000; // ~1.2 MB of actual image
	const MAX_TOKENS     = 2000;
	const CALLS_PER_HOUR = 20;      // per visitor
	const TIMEOUT        = 45;      // seconds

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
		add_action( 'admin_post_nufg_ai_test', array( __CLASS__, 'handle_test' ) );
	}

	/**
	 * Ask Anthropic whether the key works, and report what it actually said.
	 * Guessing at the shape of a key refuses good ones and accepts bad ones;
	 * one real call settles it.
	 */
	public static function test() {
		$key = self::key();
		if ( '' === $key ) {
			return array( false, __( 'No key is set.', 'noga-ufiber-guide' ) );
		}
		$res = wp_remote_post( self::ENDPOINT, array(
			'timeout' => 20,
			'headers' => self::headers(),
			'body'    => wp_json_encode( array(
				'model'      => self::model(),
				'max_tokens' => 4,
				'messages'   => array( array( 'role' => 'user', 'content' => 'Reply with the word ok.' ) ),
			) ),
		) );
		if ( is_wp_error( $res ) ) {
			return array( false, sprintf(
				/* translators: %s: error text from the server */
				__( 'This site could not reach Anthropic: %s', 'noga-ufiber-guide' ),
				$res->get_error_message()
			) );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		$body = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( 200 === $code ) {
			return array( true, sprintf(
				/* translators: %s: model name */
				__( 'The key works. Answered by %s.', 'noga-ufiber-guide' ),
				isset( $body['model'] ) ? $body['model'] : self::model()
			) );
		}
		$msg = isset( $body['error']['message'] ) ? $body['error']['message'] : '';
		if ( 401 === $code ) {
			$msg = __( 'Anthropic rejected the key. Check it was copied whole and has not been deleted in the console.', 'noga-ufiber-guide' );
		} elseif ( 400 === $code && false !== stripos( $msg, 'model' ) ) {
			$msg = sprintf(
				/* translators: %s: model name */
				__( 'The key is accepted but the model name is not: %s', 'noga-ufiber-guide' ),
				self::model()
			);
		} elseif ( 429 === $code ) {
			$msg = __( 'The key works but the account is rate limited or out of credit.', 'noga-ufiber-guide' );
		}
		$k = self::key();
		return array( false, sprintf(
			/* translators: 1: HTTP status, 2: message, 3: key length, 4: last four characters, 5: first characters */
			__( 'HTTP %1$d. %2$s (the key sent was %3$d characters, starting %5$s and ending %4$s — compare that with the console; if it differs, the paste was incomplete.)', 'noga-ufiber-guide' ),
			$code,
			$msg,
			strlen( $k ),
			substr( $k, -4 ),
			substr( $k, 0, 11 )
		) );
	}

	public static function handle_test() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Not allowed.', 'noga-ufiber-guide' ) );
		}
		check_admin_referer( 'nufg_ai_test' );
		list( $ok, $msg ) = self::test();
		set_transient( 'nufg_ai_test_result', array( 'ok' => $ok, 'msg' => $msg ), 120 );
		wp_safe_redirect( admin_url( 'options-general.php?page=nufg' ) );
		exit;
	}

	/** Configured means: a key exists and the setting is on. */
	public static function available() {
		return self::key() !== '' && (bool) get_option( 'nufg_ai_enabled', 0 );
	}

	const KEY_OPTION = 'nufg_ai_key';

	/**
	 * wp-config.php wins. Failing that, a key saved in the settings screen, which
	 * is stored encrypted: the encryption key comes from this site's own salts,
	 * which live in wp-config.php and are not in the database. So a stolen
	 * database dump alone yields nothing usable.
	 *
	 * It is still weaker than the constant. Anyone who can run PHP on this site
	 * can decrypt it, and rotating the salts makes the saved key unreadable — it
	 * then reads as absent and has to be entered again.
	 */
	private static function key() {
		if ( defined( 'NUFG_CLAUDE_API_KEY' ) && is_string( NUFG_CLAUDE_API_KEY ) && '' !== trim( NUFG_CLAUDE_API_KEY ) ) {
			return trim( NUFG_CLAUDE_API_KEY );
		}
		return self::decrypt( (string) get_option( self::KEY_OPTION, '' ) );
	}

	/** True when the key comes from wp-config.php, which cannot be edited here. */
	public static function key_is_constant() {
		return defined( 'NUFG_CLAUDE_API_KEY' ) && is_string( NUFG_CLAUDE_API_KEY ) && '' !== trim( NUFG_CLAUDE_API_KEY );
	}

	/** For the settings screen: enough to recognise the key, never the key. */
	public static function key_hint() {
		$k = self::key();
		return '' === $k ? '' : '…' . substr( $k, -4 );
	}

	public static function can_store() {
		return function_exists( 'openssl_encrypt' ) && function_exists( 'random_bytes' );
	}

	private static function secret() {
		return hash( 'sha256', wp_salt( 'auth' ) . '|nufg-ai-key', true );
	}

	public static function encrypt( $plain ) {
		if ( '' === $plain || ! self::can_store() ) {
			return '';
		}
		try {
			$iv = random_bytes( 16 );
		} catch ( Exception $e ) {
			return '';
		}
		$c = openssl_encrypt( $plain, 'aes-256-cbc', self::secret(), OPENSSL_RAW_DATA, $iv );
		return false === $c ? '' : 'v1:' . base64_encode( $iv . $c );
	}

	private static function decrypt( $stored ) {
		if ( '' === $stored || 0 !== strpos( $stored, 'v1:' ) || ! self::can_store() ) {
			return '';
		}
		$raw = base64_decode( substr( $stored, 3 ), true );
		if ( false === $raw || strlen( $raw ) <= 16 ) {
			return '';
		}
		$plain = openssl_decrypt( substr( $raw, 16 ), 'aes-256-cbc', self::secret(), OPENSSL_RAW_DATA, substr( $raw, 0, 16 ) );
		return is_string( $plain ) ? $plain : '';   // salts rotated: treated as no key
	}

	/** Only needed for a key that spans several workspaces. */
	private static function workspace() {
		if ( defined( 'NUFG_CLAUDE_WORKSPACE_ID' ) && is_string( NUFG_CLAUDE_WORKSPACE_ID ) ) {
			return trim( NUFG_CLAUDE_WORKSPACE_ID );
		}
		return (string) get_option( 'nufg_ai_workspace', '' );
	}

	private static function headers() {
		$h = array(
			'content-type'      => 'application/json',
			'x-api-key'         => self::key(),
			'anthropic-version' => self::API_VERSION,
		);
		$w = self::workspace();
		if ( '' !== $w ) {
			$h['anthropic-workspace-id'] = $w;
		}
		return $h;
	}

	private static function model() {
		if ( defined( 'NUFG_CLAUDE_MODEL' ) && is_string( NUFG_CLAUDE_MODEL ) && NUFG_CLAUDE_MODEL !== '' ) {
			return NUFG_CLAUDE_MODEL;
		}
		return self::DEFAULT_MODEL;
	}

	public static function routes() {
		register_rest_route( 'nufg/v1', '/ai', array(
			'methods'             => 'POST',
			'permission_callback' => '__return_true',
			'callback'            => array( __CLASS__, 'rest_ai' ),
		) );
	}

	/** Every refusal returns 200 with a reason, so the guide falls back quietly. */
	private static function no( $reason, $status = 200 ) {
		return new WP_REST_Response( array( 'ok' => false, 'reason' => $reason ), $status );
	}

	public static function rest_ai( $req ) {
		if ( ! self::available() ) {
			return self::no( 'unconfigured' );
		}
		if ( ! NUFG_Usage::token_ok( $req ) ) {
			return self::no( 'rejected' );
		}
		if ( ! NUFG_Usage::rate_ok( 'ai', self::CALLS_PER_HOUR ) ) {
			return self::no( 'rate_limited', 429 );
		}

		$messages = self::messages( $req );
		if ( is_wp_error( $messages ) ) {
			return self::no( $messages->get_error_code(), 400 );
		}

		$body = array(
			'model'      => self::model(),
			'max_tokens' => min( self::MAX_TOKENS, max( 256, (int) $req->get_param( 'max_tokens' ) ) ),
			'messages'   => $messages,
		);
		$system = $req->get_param( 'system' );
		if ( is_string( $system ) && '' !== trim( $system ) ) {
			$body['system'] = substr( $system, 0, 4000 );
		}

		$res = wp_remote_post( self::ENDPOINT, array(
			'timeout' => self::TIMEOUT,
			'headers' => self::headers(),
			'body'    => wp_json_encode( $body ),
		) );

		if ( is_wp_error( $res ) ) {
			return self::no( 'unreachable' );
		}
		$code = (int) wp_remote_retrieve_response_code( $res );
		if ( 200 !== $code ) {
			// Never pass the upstream message through: it can carry account details.
			return self::no( 429 === $code ? 'rate_limited' : 'upstream_' . $code );
		}
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		$text = '';
		if ( isset( $data['content'] ) && is_array( $data['content'] ) ) {
			foreach ( $data['content'] as $part ) {
				if ( isset( $part['type'], $part['text'] ) && 'text' === $part['type'] ) {
					$text .= $part['text'];
				}
			}
		}
		if ( '' === $text ) {
			return self::no( 'empty' );
		}
		return new WP_REST_Response( array(
			'ok'        => true,
			'text'      => $text,
			'truncated' => isset( $data['stop_reason'] ) && 'max_tokens' === $data['stop_reason'],
		), 200 );
	}

	/** Accepts either a single prompt or a short conversation, plus images. */
	private static function messages( $req ) {
		$turns = $req->get_param( 'turns' );
		$out   = array();

		if ( is_array( $turns ) && $turns ) {
			foreach ( array_slice( $turns, -12 ) as $t ) {
				$role = ( isset( $t['role'] ) && 'assistant' === $t['role'] ) ? 'assistant' : 'user';
				$txt  = isset( $t['content'] ) && is_string( $t['content'] ) ? substr( $t['content'], 0, self::MAX_PROMPT ) : '';
				if ( '' !== trim( $txt ) ) {
					$out[] = array( 'role' => $role, 'content' => $txt );
				}
			}
			if ( ! $out ) {
				return new WP_Error( 'empty' );
			}
			return $out;
		}

		$prompt = $req->get_param( 'prompt' );
		if ( ! is_string( $prompt ) || '' === trim( $prompt ) ) {
			return new WP_Error( 'empty' );
		}
		$content = array();
		foreach ( self::images( $req ) as $img ) {
			$content[] = $img;
		}
		$content[] = array( 'type' => 'text', 'text' => substr( $prompt, 0, self::MAX_PROMPT ) );
		return array( array( 'role' => 'user', 'content' => $content ) );
	}

	/** Images arrive as data URLs from the guide; only real image types pass. */
	private static function images( $req ) {
		$in  = $req->get_param( 'images' );
		$out = array();
		if ( ! is_array( $in ) ) {
			return $out;
		}
		$allowed = array( 'image/jpeg', 'image/png', 'image/gif', 'image/webp' );
		foreach ( array_slice( $in, 0, self::MAX_IMAGES ) as $src ) {
			if ( ! is_string( $src ) || ! preg_match( '#^data:(image/[a-z+]+);base64,([A-Za-z0-9+/=]+)$#', $src, $m ) ) {
				continue;
			}
			if ( ! in_array( $m[1], $allowed, true ) || strlen( $m[2] ) > self::MAX_IMAGE_B64 ) {
				continue;
			}
			$out[] = array(
				'type'   => 'image',
				'source' => array( 'type' => 'base64', 'media_type' => $m[1], 'data' => $m[2] ),
			);
		}
		return $out;
	}
}
