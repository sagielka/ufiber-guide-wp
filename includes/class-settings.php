<?php
/**
 * Settings → UFIBER Guide
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class NUFG_Settings {

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
		add_action( 'admin_post_nufg_check_updates', array( __CLASS__, 'handle_check' ) );
	}

	public static function menu() {
		add_options_page(
			__( 'UFIBER Guide', 'noga-ufiber-guide' ),
			__( 'UFIBER Guide', 'noga-ufiber-guide' ),
			'manage_options',
			'nufg',
			array( __CLASS__, 'page' )
		);
	}

	public static function register() {
		// Two plain on/off switches, kept outside the main options array so they
		// read cheaply from the front end on every page view.
		register_setting( 'nufg', 'nufg_usage_enabled', array( 'type' => 'boolean', 'sanitize_callback' => array( __CLASS__, 'bool' ), 'default' => 0 ) );
		register_setting( 'nufg', NUFG_AI::KEY_OPTION, array( 'type' => 'string', 'sanitize_callback' => array( __CLASS__, 'save_key' ), 'default' => '' ) );
		register_setting( 'nufg', 'nufg_ai_enabled', array( 'type' => 'boolean', 'sanitize_callback' => array( __CLASS__, 'bool' ), 'default' => 0 ) );
		register_setting(
			'nufg',
			NUFG_Plugin::OPTION,
			array( 'type' => 'array', 'sanitize_callback' => array( __CLASS__, 'sanitize' ), 'default' => NUFG_Plugin::defaults() )
		);
	}

	/** The key is written encrypted and never read back into the page. */
	public static function save_key( $v ) {
		$v = is_string( $v ) ? trim( $v ) : '';
		if ( '' === $v ) {
			return (string) get_option( NUFG_AI::KEY_OPTION, '' );   // left blank: keep what is there
		}
		if ( '__clear__' === $v ) {
			return '';
		}
		// Pasting rarely gives a clean key: smart quotes, a zero-width character,
		// the whole define(...) line from the instructions, or a stray byte that
		// is not valid UTF-8. Pull the key out of whatever arrived. Deliberately
		// byte-wise, with no /u modifier: on invalid UTF-8 a /u pattern returns
		// null, which silently turned a good key into "no key found".
		$raw = $v;
		$v   = str_replace( array( "\xE2\x80\x8B", "\xE2\x80\x8C", "\xE2\x80\x8D", "\xEF\xBB\xBF", "\xC2\xA0" ), '', $v );
		$v   = preg_replace( '/\s+/', '', $v );   // a key never contains a space, but a copy of one can be wrapped
		if ( preg_match( '/sk-[A-Za-z0-9_\-]{20,}/', $v, $m ) ) {
			$v = $m[0];
		} else {
			// Say what actually arrived. "0 characters" means the field was empty
			// or the browser overwrote it; a short value usually means autofill
			// put a saved password in instead of the key.
			add_settings_error(
				'nufg',
				'nufg_key',
				sprintf(
					/* translators: %d: number of characters received */
					__( 'No API key found in what was pasted (%d characters arrived). A key looks like sk-ant-… and is about a hundred characters long. If that says 0, the box was empty when you saved — some browsers overwrite a password box with a saved password, so paste the key again just before pressing Save.', 'noga-ufiber-guide' ),
					strlen( (string) $raw )
				)
			);
			return (string) get_option( NUFG_AI::KEY_OPTION, '' );
		}
		$enc = NUFG_AI::encrypt( $v );
		if ( '' === $enc ) {
			add_settings_error( 'nufg', 'nufg_key', __( 'This server cannot encrypt the key, so it was not saved. Put it in wp-config.php instead.', 'noga-ufiber-guide' ) );
			return (string) get_option( NUFG_AI::KEY_OPTION, '' );
		}
		return $enc;
	}

	public static function bool( $v ) {
		return empty( $v ) ? 0 : 1;
	}

	public static function sanitize( $in ) {
		$old = NUFG_Plugin::options();
		$in  = is_array( $in ) ? $in : array();
		$out = $old;

		$tab = isset( $in['tab'] ) ? sanitize_key( $in['tab'] ) : $old['tab'];
		$out['tab']        = isset( NUFG_Plugin::TABS[ $tab ] ) ? $tab : 'find';
		$out['units']      = ( isset( $in['units'] ) && 'inch' === $in['units'] ) ? 'inch' : 'mm';
		$out['brand']      = empty( $in['brand'] ) ? 0 : 1;
		$out['scroll_off'] = isset( $in['scroll_off'] ) ? max( 0, min( 400, (int) $in['scroll_off'] ) ) : $old['scroll_off'];

		$out['update_mode'] = ( isset( $in['update_mode'] ) && 'github' === $in['update_mode'] ) ? 'github' : 'json';
		$out['update_url']  = isset( $in['update_url'] ) ? NUFG_Updater::clean_url( $in['update_url'] ) : '';
		$out['github_repo'] = isset( $in['github_repo'] ) ? NUFG_Updater::normalize_github( $in['github_repo'] ) : '';
		// Keep the saved token unless a new one was typed. A single "-" clears it.
		$token = isset( $in['github_token'] ) ? trim( (string) $in['github_token'] ) : '';
		if ( '' === $token ) {
			$out['github_token'] = $old['github_token'];
		} elseif ( '-' === $token ) {
			$out['github_token'] = '';
		} else {
			$out['github_token'] = preg_replace( '/[^A-Za-z0-9_\-]/', '', $token );
		}

		if ( isset( $in['update_url'] ) && '' !== trim( $in['update_url'] ) && '' === $out['update_url'] ) {
			add_settings_error( NUFG_Plugin::OPTION, 'nufg_url', __( 'The update URL must be a full https:// address.', 'noga-ufiber-guide' ) );
		}
		if ( 'github' === $out['update_mode'] && '' === $out['github_repo'] && ! empty( $in['github_repo'] ) ) {
			add_settings_error( NUFG_Plugin::OPTION, 'nufg_repo', __( 'Enter the repository as owner/name, for example nogamt/ufiber-guide-wp.', 'noga-ufiber-guide' ) );
		}
		return $out;
	}

	public static function handle_check() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to do this.', 'noga-ufiber-guide' ), 403 );
		}
		check_admin_referer( 'nufg_check_updates' );
		$r = NUFG_Updater::check_now();
		// Make WordPress re-read the update list as well so the Plugins screen is current.
		delete_site_transient( 'update_plugins' );
		wp_safe_redirect(
			add_query_arg(
				array( 'page' => 'nufg', 'nufg_checked' => $r['ok'] ? '1' : '0', 'nufg_msg' => rawurlencode( $r['message'] ) ),
				admin_url( 'options-general.php' )
			)
		);
		exit;
	}

	public static function page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$o      = NUFG_Plugin::options();
		$src    = NUFG_Updater::source();
		$avail  = NUFG_Updater::available_version();
		$last   = NUFG_Updater::last_checked();
		$name   = NUFG_Plugin::OPTION;
		$active = NUFG_Updater::active();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'UFIBER Guide', 'noga-ufiber-guide' ); ?></h1>

			<?php
			// phpcs:disable WordPress.Security.NonceVerification
			if ( isset( $_GET['nufg_msg'] ) ) {
				$cls = ( isset( $_GET['nufg_checked'] ) && '1' === $_GET['nufg_checked'] ) ? 'notice-success' : 'notice-error';
				echo '<div class="notice ' . esc_attr( $cls ) . ' is-dismissible"><p>' . esc_html( rawurldecode( wp_unslash( $_GET['nufg_msg'] ) ) ) . '</p></div>';
			}
			// phpcs:enable
			settings_errors( $name );
			?>

			<p><?php
				echo wp_kses(
					__( 'Add the guide with the <strong>UFIBER Guide</strong> widget in Elementor (category <em>NOGA MT</em>), or with the shortcode below.', 'noga-ufiber-guide' ),
					array( 'strong' => array(), 'em' => array() )
				);
			?></p>
			<p><code>[ufiber_guide]</code> &nbsp; <code>[ufiber_guide tab="speeds" units="inch"]</code> &nbsp; <code>[ufiber_guide height="900"]</code></p>

			<form method="post" action="options.php">
				<?php settings_fields( 'nufg' ); ?>

				<h2><?php esc_html_e( 'Defaults', 'noga-ufiber-guide' ); ?></h2>
				<p class="description"><?php esc_html_e( 'Used by the shortcode and as the starting values of new widgets.', 'noga-ufiber-guide' ); ?></p>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><label for="nufg_tab"><?php esc_html_e( 'Start on', 'noga-ufiber-guide' ); ?></label></th>
						<td>
							<select id="nufg_tab" name="<?php echo esc_attr( $name ); ?>[tab]">
								<?php
								$labels = array(
									'find' => __( 'Find a tool', 'noga-ufiber-guide' ), 'speeds' => __( 'Speeds & feeds', 'noga-ufiber-guide' ),
									'fix' => __( 'Fix a problem', 'noga-ufiber-guide' ), 'replace' => __( 'Replace XEBEC', 'noga-ufiber-guide' ),
									'learn' => __( 'Learn', 'noga-ufiber-guide' ), 'products' => __( 'Products', 'noga-ufiber-guide' ),
								);
								foreach ( $labels as $k => $l ) {
									echo '<option value="' . esc_attr( $k ) . '"' . selected( $o['tab'], $k, false ) . '>' . esc_html( $l ) . '</option>';
								}
								?>
							</select>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="nufg_units"><?php esc_html_e( 'Units', 'noga-ufiber-guide' ); ?></label></th>
						<td>
							<select id="nufg_units" name="<?php echo esc_attr( $name ); ?>[units]">
								<option value="mm" <?php selected( $o['units'], 'mm' ); ?>>mm</option>
								<option value="inch" <?php selected( $o['units'], 'inch' ); ?>><?php esc_html_e( 'inch', 'noga-ufiber-guide' ); ?></option>
							</select>
							<p class="description"><?php esc_html_e( 'Visitors can switch units themselves inside the guide.', 'noga-ufiber-guide' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Logo bar', 'noga-ufiber-guide' ); ?></th>
						<td><label><input type="checkbox" name="<?php echo esc_attr( $name ); ?>[brand]" value="1" <?php checked( $o['brand'] ); ?>> <?php esc_html_e( 'Show the NOGA MT logo at the top of the guide', 'noga-ufiber-guide' ); ?></label></td>
					</tr>
					<tr>
						<th scope="row"><label for="nufg_off"><?php esc_html_e( 'Scroll offset', 'noga-ufiber-guide' ); ?></label></th>
						<td>
							<input id="nufg_off" type="number" min="0" max="400" class="small-text" name="<?php echo esc_attr( $name ); ?>[scroll_off]" value="<?php echo esc_attr( $o['scroll_off'] ); ?>"> px
							<p class="description"><?php esc_html_e( 'Height of your sticky site header, so the guide is not hidden underneath it after opening a new section.', 'noga-ufiber-guide' ); ?></p>
						</td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'Updates', 'noga-ufiber-guide' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Installed version', 'noga-ufiber-guide' ); ?></th>
						<td>
							<strong><?php echo esc_html( NUFG_VERSION ); ?></strong>
							<?php if ( $avail ) : ?>
								&nbsp;<span style="color:#b32d2e">
									<?php
									/* translators: %s: version */
									printf( esc_html__( 'Version %s is available.', 'noga-ufiber-guide' ), esc_html( $avail ) );
									?>
									<?php
								$nufg_file = plugin_basename( NUFG_FILE );
								$nufg_url  = wp_nonce_url(
									self_admin_url( 'update.php?action=upgrade-plugin&plugin=' . rawurlencode( $nufg_file ) ),
									'upgrade-plugin_' . $nufg_file
								);
								?>
								<a class="button button-primary" href="<?php echo esc_url( $nufg_url ); ?>"><?php esc_html_e( 'Install it now', 'noga-ufiber-guide' ); ?></a>
								<span class="description"><?php esc_html_e( 'or update it from the Plugins screen', 'noga-ufiber-guide' ); ?></span>
								</span>
							<?php elseif ( $active && $last ) : ?>
								&nbsp;<span style="color:#1a7f37"><?php esc_html_e( 'Up to date.', 'noga-ufiber-guide' ); ?></span>
								<span class="description"><?php
									/* translators: %s: time */
									printf( esc_html__( 'Last checked %s ago.', 'noga-ufiber-guide' ), esc_html( human_time_diff( $last ) ) );
								?></span>
							<?php elseif ( ! $active ) : ?>
								&nbsp;<span class="description"><?php esc_html_e( 'No update source set. Choose one below to receive updates.', 'noga-ufiber-guide' ); ?></span>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Update source', 'noga-ufiber-guide' ); ?></th>
						<td>
							<fieldset>
								<label><input type="radio" name="<?php echo esc_attr( $name ); ?>[update_mode]" value="json" <?php checked( $o['update_mode'], 'json' ); ?>> <?php esc_html_e( 'Update manifest (update.json on your server)', 'noga-ufiber-guide' ); ?></label><br>
								<input type="url" class="regular-text code" name="<?php echo esc_attr( $name ); ?>[update_url]" value="<?php echo esc_attr( $o['update_url'] ); ?>" placeholder="https://www.example.com/updates/noga-ufiber-guide/update.json" style="margin:4px 0 12px 24px;width:min(520px,90%)"><br>
								<label><input type="radio" name="<?php echo esc_attr( $name ); ?>[update_mode]" value="github" <?php checked( $o['update_mode'], 'github' ); ?>> <?php esc_html_e( 'GitHub releases', 'noga-ufiber-guide' ); ?></label><br>
								<input type="text" class="regular-text code" name="<?php echo esc_attr( $name ); ?>[github_repo]" value="<?php echo esc_attr( $o['github_repo'] ); ?>" placeholder="owner/repository" style="margin:4px 0 6px 24px"><br>
								<input type="password" class="regular-text code" autocomplete="new-password" name="<?php echo esc_attr( $name ); ?>[github_token]" value="" placeholder="<?php echo $o['github_token'] ? esc_attr__( 'Token saved – leave empty to keep, type - to remove', 'noga-ufiber-guide' ) : esc_attr__( 'Access token (private repositories only)', 'noga-ufiber-guide' ); ?>" style="margin:0 0 4px 24px">
							</fieldset>
							<?php if ( $src ) : ?>
								<p class="description"><?php
									/* translators: %s: URL */
									printf( esc_html__( 'Currently checking: %s', 'noga-ufiber-guide' ), '<code>' . esc_html( $src['url'] ) . '</code>' );
								?></p>
							<?php endif; ?>
							<p class="description"><?php esc_html_e( 'WordPress checks twice a day. When a newer version exists it appears under Dashboard → Updates and Plugins, where you can also switch on automatic updates for this plugin.', 'noga-ufiber-guide' ); ?></p>
						</td>
					</tr>
				</table>

				<h2><?php esc_html_e( 'AI and usage data', 'noga-ufiber-guide' ); ?></h2>
				<table class="form-table" role="presentation">
					<tr>
						<th scope="row"><?php esc_html_e( 'Reading with AI', 'noga-ufiber-guide' ); ?></th>
						<td>
							<?php $hint = NUFG_AI::key_hint(); $fixed = NUFG_AI::key_is_constant(); ?>
							<label><input type="checkbox" name="nufg_ai_enabled" value="1" <?php checked( get_option( 'nufg_ai_enabled', 0 ), 1 ); ?> <?php disabled( '' === $hint ); ?>>
								<?php esc_html_e( 'Let the guide read a customer e-mail or drawing, summarise it and ask follow-up questions.', 'noga-ufiber-guide' ); ?></label>
							<p class="description"><?php esc_html_e( 'Each reading is a paid request, capped at 20 an hour per visitor. The guide works without this; it falls back to its offline model.', 'noga-ufiber-guide' ); ?></p>

							<h4 style="margin-bottom:4px"><?php esc_html_e( 'API key', 'noga-ufiber-guide' ); ?></h4>
							<?php if ( $fixed ) : ?>
								<p><?php printf( esc_html__( 'Set in wp-config.php (%s). That is the safest place; this screen cannot change it.', 'noga-ufiber-guide' ), '<code>' . esc_html( $hint ) . '</code>' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
							<?php else : ?>
								<?php if ( '' !== $hint ) : ?>
									<p><?php printf( esc_html__( 'A key is saved here (%s). Leave the box empty to keep it.', 'noga-ufiber-guide' ), '<code>' . esc_html( $hint ) . '</code>' ); // phpcs:ignore WordPress.Security.EscapeOutput ?></p>
								<?php endif; ?>
								<p><input type="password" class="regular-text" name="<?php echo esc_attr( NUFG_AI::KEY_OPTION ); ?>" value="" autocomplete="new-password" data-lpignore="true" spellcheck="false" placeholder="sk-ant-..."></p>
								<p class="description">
									<?php esc_html_e( 'Saved encrypted, using this site\'s own salts from wp-config.php — a stolen database alone cannot read it. Anyone who can run code on this site still can, so the safer place is wp-config.php itself:', 'noga-ufiber-guide' ); ?>
								</p>
								<p><code>define( 'NUFG_CLAUDE_API_KEY', 'sk-ant-...' );</code></p>
								<p class="description"><?php esc_html_e( 'To remove the saved key, type __clear__ in the box and save. If the site\'s salts are ever changed, the saved key stops working and has to be entered again.', 'noga-ufiber-guide' ); ?></p>
								<?php if ( ! NUFG_AI::can_store() ) : ?>
									<p class="description"><strong><?php esc_html_e( 'This server has no encryption support, so a key cannot be saved here. Use wp-config.php.', 'noga-ufiber-guide' ); ?></strong></p>
								<?php endif; ?>
							<?php endif; ?>
						</td>
					</tr>
					<tr>
						<th scope="row"><?php esc_html_e( 'Usage data', 'noga-ufiber-guide' ); ?></th>
						<td>
							<label><input type="checkbox" name="nufg_usage_enabled" value="1" <?php checked( get_option( 'nufg_usage_enabled', 0 ), 1 ); ?>>
								<?php esc_html_e( 'Record which jobs people look up: task, material, tool family and item number.', 'noga-ufiber-guide' ); ?></label>
							<p class="description"><?php esc_html_e( 'Never anything a visitor typed, and stored in this site only. Applications people deliberately send are always kept, whether this is on or off. Rows are deleted after a year.', 'noga-ufiber-guide' ); ?>
								<a href="<?php echo esc_url( admin_url( 'options-general.php?page=nufg-usage' ) ); ?>"><?php esc_html_e( 'See what has been collected', 'noga-ufiber-guide' ); ?></a>
								<?php esc_html_e( 'Check your privacy policy covers this before switching it on.', 'noga-ufiber-guide' ); ?></p>
						</td>
					</tr>
				</table>
				<?php submit_button(); ?>
			</form>

			<?php if ( $active ) : ?>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="nufg_check_updates">
					<?php wp_nonce_field( 'nufg_check_updates' ); ?>
					<?php submit_button( __( 'Check for updates now', 'noga-ufiber-guide' ), 'secondary', 'submit', false ); ?>
				</form>
			<?php endif; ?>
		</div>
		<?php
	}
}
