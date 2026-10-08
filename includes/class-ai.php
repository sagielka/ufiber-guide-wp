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
	}

	/** Configured means: a key exists and the setting is on. */
	public static function available() {
		return self::key() !== '' && (bool) get_option( 'nufg_ai_enabled', 0 );
	}

	private static function key() {
		if ( defined( 'NUFG_CLAUDE_API_KEY' ) && is_string( NUFG_CLAUDE_API_KEY ) ) {
			return trim( NUFG_CLAUDE_API_KEY );
		}
		return '';
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
			'headers' => array(
				'content-type'      => 'application/json',
				'x-api-key'         => self::key(),
				'anthropic-version' => self::API_VERSION,
			),
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
