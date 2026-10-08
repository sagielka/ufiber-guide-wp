<?php
/**
 * Plugin Name:       NOGA MT – UFIBER Guide for Elementor
 * Plugin URI:        https://www.noga.com/nogamt/ufiber-ceramic-brush/
 * Description:       The UFIBER Guide for your website: tool selector, speeds &amp; feeds, troubleshooter, XEBEC converter and product builder. Adds an Elementor widget and a [ufiber_guide] shortcode, and updates itself from your update source.
 * Version:           1.5.1
 * Requires at least: 5.8
 * Requires PHP:      7.4
 * Author:            NOGA MT
 * Author URI:        https://www.noga.com/nogamt/
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       noga-ufiber-guide
 * Domain Path:       /languages
 * Elementor tested up to: 3.32
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'NUFG_VERSION', '1.5.1' );
define( 'NUFG_FILE', __FILE__ );
define( 'NUFG_DIR', plugin_dir_path( __FILE__ ) );
define( 'NUFG_URL', plugin_dir_url( __FILE__ ) );
define( 'NUFG_SLUG', 'noga-ufiber-guide' );

/**
 * Update source baked into this build (set by the release tool, or define it in wp-config.php).
 * A JSON manifest URL (https) or a GitHub repository URL. Can be changed under Settings → UFIBER Guide.
 */
if ( ! defined( 'NUFG_DEFAULT_UPDATE_URL' ) ) {
	define( 'NUFG_DEFAULT_UPDATE_URL', '' );
}

require_once NUFG_DIR . 'includes/class-plugin.php';

add_action( 'plugins_loaded', array( 'NUFG_Plugin', 'instance' ) );
register_activation_hook( __FILE__, array( 'NUFG_Plugin', 'activate' ) );
