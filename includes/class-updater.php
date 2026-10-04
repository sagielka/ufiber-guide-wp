<?php
/**
 * Automatic updates. Uses the bundled Plugin Update Checker library (MIT) to feed WordPress's
 * normal update system, so updates show up in Dashboard → Updates and Plugins, support the core
 * "enable auto-updates" toggle, and can be rolled out from either a JSON manifest or GitHub releases.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class NUFG_Updater {

	/** @var object|null Plugin Update Checker instance. */
	private static $checker = null;
	private static $source  = null;

	public static function init() {
		$source = self::resolve_source( NUFG_Plugin::options() );
		if ( ! $source ) {
			return;
		}
		self::$source = $source;

		require_once NUFG_DIR . 'vendor/plugin-update-checker/plugin-update-checker.php';

		try {
			$checker = \YahnisElsts\PluginUpdateChecker\v5\PucFactory::buildUpdateChecker( $source['url'], NUFG_FILE, NUFG_SLUG, 12 );

			if ( 'github' === $source['type'] ) {
				if ( '' !== $source['token'] ) {
					$checker->setAuthentication( $source['token'] );
				}
				// Use the zip attached to the release (built by the release kit) so the folder name is correct.
				$checker->getVcsApi()->enableReleaseAssets();
			}
			self::$checker = $checker;
		} catch ( \Throwable $e ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log( 'UFIBER Guide updater: ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions
			}
		}
	}

	/**
	 * Work out where updates come from. Returns array(type,url,token) or null.
	 * Order: saved settings → NUFG_DEFAULT_UPDATE_URL constant.
	 */
	public static function resolve_source( array $o ) {
		if ( 'github' === $o['update_mode'] ) {
			$repo = self::normalize_github( $o['github_repo'] );
			if ( $repo ) {
				return array( 'type' => 'github', 'url' => $repo, 'token' => (string) $o['github_token'] );
			}
		} elseif ( ! empty( $o['update_url'] ) ) {
			$url = self::clean_url( $o['update_url'] );
			if ( $url ) {
				return array( 'type' => 'json', 'url' => $url, 'token' => '' );
			}
		}

		$default = trim( (string) NUFG_DEFAULT_UPDATE_URL );
		if ( '' !== $default ) {
			$gh = self::normalize_github( $default );
			if ( $gh ) {
				return array( 'type' => 'github', 'url' => $gh, 'token' => '' );
			}
			$url = self::clean_url( $default );
			if ( $url ) {
				return array( 'type' => 'json', 'url' => $url, 'token' => '' );
			}
		}
		return null;
	}

	/** https only (http allowed for localhost during testing). */
	public static function clean_url( $url ) {
		$url = esc_url_raw( trim( (string) $url ), array( 'https', 'http' ) );
		if ( '' === $url ) {
			return '';
		}
		$parts = wp_parse_url( $url );
		if ( empty( $parts['host'] ) ) {
			return '';
		}
		$local = in_array( $parts['host'], array( 'localhost', '127.0.0.1' ), true );
		if ( 'https' !== ( $parts['scheme'] ?? '' ) && ! $local ) {
			return '';
		}
		return $url;
	}

	/** Accepts "owner/repo" or a github.com URL; returns "https://github.com/owner/repo/" or ''. */
	public static function normalize_github( $value ) {
		$value = trim( (string) $value );
		if ( preg_match( '#^(?:https?://(?:www\.)?github\.com/)?([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?/?$#', $value, $m ) ) {
			if ( false === strpos( $value, '://' ) || false !== stripos( $value, 'github.com' ) ) {
				return 'https://github.com/' . $m[1] . '/' . $m[2] . '/';
			}
		}
		return '';
	}

	public static function source() {
		return self::$source;
	}

	public static function active() {
		return null !== self::$checker;
	}

	/**
	 * Ask the update source now. Returns array( 'ok'=>bool, 'message'=>string, 'version'=>string|null ).
	 */
	public static function check_now() {
		if ( ! self::$checker ) {
			return array( 'ok' => false, 'message' => __( 'No update source is configured.', 'noga-ufiber-guide' ), 'version' => null );
		}

		// The library reports transport / HTTP problems through this action.
		$errors   = array();
		$collect  = function ( $error ) use ( &$errors ) {
			$errors[] = is_wp_error( $error ) ? $error->get_error_message() : __( 'Unexpected response.', 'noga-ufiber-guide' );
		};
		add_action( 'puc_api_error', $collect, 10, 1 );
		$update = self::$checker->checkForUpdates();
		remove_action( 'puc_api_error', $collect, 10 );

		// A release can be found even when a side request fails (GitHub returns 404 for the
		// header file when the plugin lives in a subfolder). Report what matters: the version.
		if ( $update && version_compare( $update->version, NUFG_VERSION, '>' ) ) {
			return array(
				'ok'      => true,
				/* translators: %s: version number */
				'message' => sprintf( __( 'Update available: version %s.', 'noga-ufiber-guide' ), $update->version ),
				'version' => $update->version,
			);
		}
		if ( $errors && ! $update ) {
			/* translators: %s: error text */
			return array( 'ok' => false, 'message' => sprintf( __( 'Could not read the update source: %s', 'noga-ufiber-guide' ), $errors[0] ), 'version' => null );
		}
		return array( 'ok' => true, 'message' => __( 'You are running the latest version.', 'noga-ufiber-guide' ), 'version' => null );
	}

	public static function available_version() {
		if ( ! self::$checker ) {
			return null;
		}
		$u = self::$checker->getUpdate();
		return ( $u && version_compare( $u->version, NUFG_VERSION, '>' ) ) ? $u->version : null;
	}

	public static function last_checked() {
		if ( ! self::$checker ) {
			return 0;
		}
		$state = self::$checker->getUpdateState();
		return $state ? (int) $state->getLastCheck() : 0;
	}
}
