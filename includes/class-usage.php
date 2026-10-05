<?php
/**
 * Usage data for the UFIBER Guide.
 *
 * Two separate things, deliberately kept apart:
 *
 *   1. Usage events. Structured fields only — which task, which material, which
 *      tool family, which screen. No free text, no e-mail addresses, no names.
 *      These are written automatically while someone uses the guide.
 *
 *   2. Shared applications. The description someone chose to send, after seeing
 *      exactly what would be sent and being able to edit it. Never automatic.
 *
 * Everything is stored in this site's own database. Nothing leaves the server.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class NUFG_Usage {

	const DB_VERSION = '1';
	const OPT_DB     = 'nufg_usage_db_version';

	public static function table() {
		global $wpdb;
		return $wpdb->prefix . 'nufg_usage';
	}

	public static function install() {
		global $wpdb;
		if ( get_option( self::OPT_DB ) === self::DB_VERSION ) {
			return;
		}
		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		$table   = self::table();
		$sql     = "CREATE TABLE {$table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			created_at DATETIME NOT NULL,
			kind VARCHAR(16) NOT NULL,
			event VARCHAR(40) NOT NULL DEFAULT '',
			task VARCHAR(32) NOT NULL DEFAULT '',
			material VARCHAR(32) NOT NULL DEFAULT '',
			family VARCHAR(32) NOT NULL DEFAULT '',
			sku VARCHAR(32) NOT NULL DEFAULT '',
			grit VARCHAR(16) NOT NULL DEFAULT '',
			dims VARCHAR(190) NOT NULL DEFAULT '',
			lang VARCHAR(8) NOT NULL DEFAULT '',
			body TEXT NULL,
			contact VARCHAR(190) NOT NULL DEFAULT '',
			PRIMARY KEY (id),
			KEY kind_created (kind, created_at)
		) {$charset};";
		dbDelta( $sql );
		update_option( self::OPT_DB, self::DB_VERSION );
	}

	public static function init() {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
		add_action( 'admin_menu', array( __CLASS__, 'menu' ), 20 );
	}

	public static function enabled() {
		return (bool) get_option( 'nufg_usage_enabled', 0 );
	}

	public static function routes() {
		$common = array(
			'permission_callback' => '__return_true',   // public page, no login
		);
		register_rest_route( 'nufg/v1', '/usage', array_merge( $common, array(
			'methods'  => 'POST',
			'callback' => array( __CLASS__, 'rest_usage' ),
		) ) );
		register_rest_route( 'nufg/v1', '/share', array_merge( $common, array(
			'methods'  => 'POST',
			'callback' => array( __CLASS__, 'rest_share' ),
		) ) );
	}

	private static function field( $req, $key, $len = 32 ) {
		$v = $req->get_param( $key );
		if ( ! is_scalar( $v ) ) {
			return '';
		}
		return substr( sanitize_text_field( (string) $v ), 0, $len );
	}

	/** Structured usage event. Any free text in the payload is ignored. */
	public static function rest_usage( $req ) {
		if ( ! self::enabled() ) {
			return new WP_REST_Response( array( 'ok' => false, 'reason' => 'disabled' ), 200 );
		}
		global $wpdb;
		$wpdb->insert( self::table(), array(
			'created_at' => current_time( 'mysql' ),
			'kind'       => 'usage',
			'event'      => self::field( $req, 'event', 40 ),
			'task'       => self::field( $req, 'task' ),
			'material'   => self::field( $req, 'material' ),
			'family'     => self::field( $req, 'family' ),
			'sku'        => self::field( $req, 'sku' ),
			'grit'       => self::field( $req, 'grit', 16 ),
			'dims'       => self::field( $req, 'dims', 190 ),
			'lang'       => self::field( $req, 'lang', 8 ),
			'body'       => null,
			'contact'    => '',
		) );
		return new WP_REST_Response( array( 'ok' => true ), 200 );
	}

	/** An application somebody chose to send, with the text they approved. */
	public static function rest_share( $req ) {
		global $wpdb;
		$body = $req->get_param( 'body' );
		$body = is_string( $body ) ? substr( wp_strip_all_tags( $body ), 0, 4000 ) : '';
		if ( '' === trim( $body ) ) {
			return new WP_REST_Response( array( 'ok' => false, 'reason' => 'empty' ), 400 );
		}
		$contact = $req->get_param( 'contact' );
		$contact = is_string( $contact ) ? substr( sanitize_text_field( $contact ), 0, 190 ) : '';
		$wpdb->insert( self::table(), array(
			'created_at' => current_time( 'mysql' ),
			'kind'       => 'share',
			'event'      => 'shared',
			'task'       => self::field( $req, 'task' ),
			'material'   => self::field( $req, 'material' ),
			'family'     => self::field( $req, 'family' ),
			'sku'        => self::field( $req, 'sku' ),
			'grit'       => self::field( $req, 'grit', 16 ),
			'dims'       => self::field( $req, 'dims', 190 ),
			'lang'       => self::field( $req, 'lang', 8 ),
			'body'       => $body,
			'contact'    => $contact,
		) );
		return new WP_REST_Response( array( 'ok' => true ), 200 );
	}

	public static function menu() {
		add_submenu_page(
			'options-general.php',
			'UFIBER Guide usage',
			'UFIBER usage',
			'manage_options',
			'nufg-usage',
			array( __CLASS__, 'page' )
		);
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		global $wpdb;
		$table = self::table();

		if ( isset( $_POST['nufg_usage_export'] ) && check_admin_referer( 'nufg_usage' ) ) {
			self::export_csv();
		}

		$counts = $wpdb->get_results( "SELECT kind, COUNT(*) c FROM {$table} GROUP BY kind", OBJECT_K );
		$usage  = isset( $counts['usage'] ) ? (int) $counts['usage']->c : 0;
		$share  = isset( $counts['share'] ) ? (int) $counts['share']->c : 0;
		$tasks  = $wpdb->get_results( "SELECT task, COUNT(*) c FROM {$table} WHERE kind='usage' AND task<>'' GROUP BY task ORDER BY c DESC LIMIT 10" );
		$mats   = $wpdb->get_results( "SELECT material, COUNT(*) c FROM {$table} WHERE kind='usage' AND material<>'' GROUP BY material ORDER BY c DESC LIMIT 10" );
		$recent = $wpdb->get_results( "SELECT * FROM {$table} WHERE kind='share' ORDER BY id DESC LIMIT 25" );
		?>
		<div class="wrap">
			<h1>UFIBER Guide usage</h1>
			<p><?php echo esc_html( sprintf( '%d usage events, %d shared applications.', $usage, $share ) ); ?>
			<?php if ( ! self::enabled() ) : ?>
				<strong><?php esc_html_e( 'Usage collection is off.', 'noga-ufiber-guide' ); ?></strong>
				<?php esc_html_e( 'Turn it on under Settings → UFIBER Guide. Shared applications are always accepted, because the person chose to send them.', 'noga-ufiber-guide' ); ?>
			<?php endif; ?>
			</p>

			<form method="post"><?php wp_nonce_field( 'nufg_usage' ); ?>
				<p><button class="button" name="nufg_usage_export" value="1">Download everything as CSV</button></p>
			</form>

			<h2>Most common jobs</h2>
			<table class="widefat striped" style="max-width:640px">
				<thead><tr><th>Task</th><th>Count</th><th>Material</th><th>Count</th></tr></thead>
				<tbody>
				<?php
				$rows = max( count( $tasks ), count( $mats ) );
				for ( $i = 0; $i < $rows; $i++ ) {
					echo '<tr><td>' . esc_html( isset( $tasks[ $i ] ) ? $tasks[ $i ]->task : '' ) . '</td><td>' .
						esc_html( isset( $tasks[ $i ] ) ? $tasks[ $i ]->c : '' ) . '</td><td>' .
						esc_html( isset( $mats[ $i ] ) ? $mats[ $i ]->material : '' ) . '</td><td>' .
						esc_html( isset( $mats[ $i ] ) ? $mats[ $i ]->c : '' ) . '</td></tr>';
				}
				?>
				</tbody>
			</table>

			<h2>Shared applications</h2>
			<p class="description">These were sent deliberately, with the text shown to the person first. They are the material worth training on.</p>
			<table class="widefat striped">
				<thead><tr><th style="width:130px">When</th><th style="width:90px">Task</th><th style="width:90px">Material</th><th>Description</th><th style="width:160px">Contact</th></tr></thead>
				<tbody>
				<?php if ( ! $recent ) : ?>
					<tr><td colspan="5">Nothing shared yet.</td></tr>
				<?php else : foreach ( $recent as $r ) : ?>
					<tr>
						<td><?php echo esc_html( $r->created_at ); ?></td>
						<td><?php echo esc_html( $r->task ); ?></td>
						<td><?php echo esc_html( $r->material ); ?></td>
						<td><?php echo esc_html( wp_trim_words( (string) $r->body, 45 ) ); ?></td>
						<td><?php echo esc_html( $r->contact ); ?></td>
					</tr>
				<?php endforeach; endif; ?>
				</tbody>
			</table>
		</div>
		<?php
	}

	private static function export_csv() {
		global $wpdb;
		$rows = $wpdb->get_results( 'SELECT * FROM ' . self::table() . ' ORDER BY id', ARRAY_A );
		nocache_headers();
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename=ufiber-usage-' . gmdate( 'Y-m-d' ) . '.csv' );
		$out = fopen( 'php://output', 'w' );
		fputcsv( $out, array( 'id', 'created_at', 'kind', 'event', 'task', 'material', 'family', 'sku', 'grit', 'dims', 'lang', 'body', 'contact' ) );
		foreach ( $rows as $r ) {
			fputcsv( $out, $r );
		}
		fclose( $out );
		exit;
	}
}
