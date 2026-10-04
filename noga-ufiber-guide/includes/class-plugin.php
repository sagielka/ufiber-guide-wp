<?php
/**
 * Core: options, asset registration, shortcode, embed renderer and Elementor wiring.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class NUFG_Plugin {

	const OPTION = 'nufg_options';

	/** Sections of the guide that can be used as the start screen. */
	const TABS = array(
		'find'     => '',
		'speeds'   => 'speeds',
		'fix'      => 'fix',
		'replace'  => 'replace',
		'learn'    => 'learn',
		'products' => 'products',
	);

	private static $instance = null;

	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		require_once NUFG_DIR . 'includes/class-settings.php';
		require_once NUFG_DIR . 'includes/class-updater.php';

		NUFG_Settings::init();
		NUFG_Updater::init();

		load_plugin_textdomain( 'noga-ufiber-guide', false, dirname( plugin_basename( NUFG_FILE ) ) . '/languages' );

		add_shortcode( 'ufiber_guide', array( $this, 'shortcode' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'register_assets' ), 5 );
		add_action( 'admin_notices', array( $this, 'maybe_notice' ) );
		add_filter( 'plugin_action_links_' . plugin_basename( NUFG_FILE ), array( $this, 'action_links' ) );

		// Elementor may have fired its "loaded" action before us (it sorts first alphabetically).
		if ( did_action( 'elementor/loaded' ) ) {
			$this->elementor();
		} else {
			add_action( 'elementor/loaded', array( $this, 'elementor' ) );
		}
	}

	public static function activate() {
		if ( false === get_option( self::OPTION, false ) ) {
			add_option( self::OPTION, self::defaults() );
		}
	}

	/* ------------------------------------------------------------ options */

	public static function defaults() {
		return array(
			'tab'          => 'find',
			'units'        => 'mm',
			'brand'        => 1,
			'scroll_off'   => 90,
			'update_mode'  => 'json',     // json | github
			'update_url'   => '',
			'github_repo'  => '',
			'github_token' => '',
		);
	}

	public static function options() {
		$saved = get_option( self::OPTION, array() );
		return wp_parse_args( is_array( $saved ) ? $saved : array(), self::defaults() );
	}

	/* ------------------------------------------------------------- assets */

	public function register_assets() {
		wp_register_style( 'nufg-embed', NUFG_URL . 'assets/css/embed.css', array(), NUFG_VERSION );
		wp_register_script( 'nufg-embed', NUFG_URL . 'assets/js/embed.js', array(), NUFG_VERSION, true );
	}

	/* --------------------------------------------------------- the embed */

	/**
	 * Build the iframe markup. Shared by the shortcode and the Elementor widget.
	 *
	 * @param array $args tab, units, brand, height ('auto' or CSS length), min_height (px), offset (px), id.
	 */
	public static function render_embed( array $args = array() ) {
		$o = self::options();
		$a = wp_parse_args(
			$args,
			array(
				'tab'        => $o['tab'],
				'units'      => $o['units'],
				'brand'      => (int) $o['brand'],
				'height'     => 'auto',
				'min_height' => 560,
				'offset'     => (int) $o['scroll_off'],
				'class'      => '',
			)
		);

		$tab    = isset( self::TABS[ $a['tab'] ] ) ? $a['tab'] : 'find';
		$units  = 'inch' === $a['units'] || 'in' === $a['units'] ? 'in' : 'mm';
		$brand  = filter_var( $a['brand'], FILTER_VALIDATE_BOOLEAN ) ? 1 : 0;
		$height = strtolower( trim( (string) $a['height'] ) );
		$fit    = ( '' === $height || 'auto' === $height );
		$min    = max( 320, min( 2000, (int) $a['min_height'] ) );
		$offset = max( 0, min( 400, (int) $a['offset'] ) );

		$css_h = '';
		if ( ! $fit ) {
			// "850", "850px" or "90vh".
			if ( preg_match( '/^(\d{3,4})(px|vh)?$/', $height, $m ) ) {
				$css_h = $m[1] . ( isset( $m[2] ) && '' !== $m[2] ? $m[2] : 'px' );
			} else {
				$fit = true;
			}
		}

		$src = add_query_arg(
			array(
				'embed' => 1,
				'fit'   => $fit ? 1 : 0,
				'units' => $units,
				'brand' => $brand,
				'ver'   => NUFG_VERSION,
			),
			NUFG_URL . 'assets/app/ufiber-guide.html'
		);
		$src .= '#/' . self::TABS[ $tab ];

		wp_enqueue_style( 'nufg-embed' );
		wp_enqueue_script( 'nufg-embed' );

		$style = '--nufg-min:' . $min . 'px;' . ( $css_h ? '--nufg-h:' . $css_h . ';' : '' );
		$title = esc_attr__( 'UFIBER Guide – tool selector and machining parameters', 'noga-ufiber-guide' );

		ob_start();
		?>
		<div class="nufg <?php echo $fit ? 'nufg--fit' : 'nufg--fixed'; ?> <?php echo esc_attr( $a['class'] ); ?>" data-nufg-fit="<?php echo $fit ? '1' : '0'; ?>" data-nufg-offset="<?php echo (int) $offset; ?>" style="<?php echo esc_attr( $style ); ?>">
			<iframe class="nufg__frame" src="<?php echo esc_url( $src ); ?>" title="<?php echo $title; // phpcs:ignore WordPress.Security.EscapeOutput ?>" loading="lazy" referrerpolicy="no-referrer" allow="clipboard-write" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals"></iframe>
			<noscript><p><a href="<?php echo esc_url( $src ); ?>"><?php esc_html_e( 'Open the UFIBER Guide', 'noga-ufiber-guide' ); ?></a></p></noscript>
		</div>
		<?php
		return ob_get_clean();
	}

	/**
	 * [ufiber_guide tab="speeds" units="inch" height="auto|900|90vh" brand="yes|no" min_height="560"]
	 */
	public function shortcode( $atts ) {
		$atts = shortcode_atts(
			array(
				'tab'        => '',
				'units'      => '',
				'height'     => 'auto',
				'brand'      => '',
				'min_height' => '',
			),
			$atts,
			'ufiber_guide'
		);
		$args = array( 'height' => $atts['height'] );
		if ( '' !== $atts['tab'] )        { $args['tab'] = sanitize_key( $atts['tab'] ); }
		if ( '' !== $atts['units'] )      { $args['units'] = sanitize_key( $atts['units'] ); }
		if ( '' !== $atts['brand'] )      { $args['brand'] = $atts['brand']; }
		if ( '' !== $atts['min_height'] ) { $args['min_height'] = (int) $atts['min_height']; }
		return self::render_embed( $args );
	}

	/* ---------------------------------------------------------- Elementor */

	public function elementor() {
		if ( ! defined( 'ELEMENTOR_VERSION' ) || version_compare( ELEMENTOR_VERSION, '3.5.0', '<' ) ) {
			return;
		}
		add_action( 'elementor/elements/categories_registered', array( $this, 'elementor_category' ) );
		add_action( 'elementor/widgets/register', array( $this, 'elementor_widget' ) );
	}

	public function elementor_category( $manager ) {
		$manager->add_category( 'noga-mt', array( 'title' => 'NOGA MT', 'icon' => 'eicon-code' ) );
	}

	public function elementor_widget( $widgets_manager ) {
		require_once NUFG_DIR . 'includes/class-elementor-widget.php';
		$widgets_manager->register( new NUFG_Elementor_Widget() );
	}

	/* -------------------------------------------------------------- admin */

	public function maybe_notice() {
		if ( ! current_user_can( 'activate_plugins' ) ) {
			return;
		}
		$screen = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
		if ( ! $screen || ! in_array( $screen->id, array( 'plugins', 'settings_page_nufg' ), true ) ) {
			return;
		}
		if ( ! defined( 'ELEMENTOR_VERSION' ) ) {
			echo '<div class="notice notice-info"><p>' . esc_html__( 'UFIBER Guide: Elementor is not active, so the widget is unavailable. You can still use the [ufiber_guide] shortcode.', 'noga-ufiber-guide' ) . '</p></div>';
		} elseif ( version_compare( ELEMENTOR_VERSION, '3.5.0', '<' ) ) {
			echo '<div class="notice notice-warning"><p>' . esc_html__( 'UFIBER Guide: the Elementor widget needs Elementor 3.5 or newer. The [ufiber_guide] shortcode still works.', 'noga-ufiber-guide' ) . '</p></div>';
		}
	}

	public function action_links( $links ) {
		array_unshift( $links, '<a href="' . esc_url( admin_url( 'options-general.php?page=nufg' ) ) . '">' . esc_html__( 'Settings', 'noga-ufiber-guide' ) . '</a>' );
		return $links;
	}
}
