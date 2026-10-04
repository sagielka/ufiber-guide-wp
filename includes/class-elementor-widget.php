<?php
/**
 * Elementor widget: UFIBER Guide.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Elementor\Controls_Manager;
use Elementor\Group_Control_Border;
use Elementor\Group_Control_Box_Shadow;
use Elementor\Widget_Base;

class NUFG_Elementor_Widget extends Widget_Base {

	public function get_name() {
		return 'nufg_guide';
	}

	public function get_title() {
		return esc_html__( 'UFIBER Guide', 'noga-ufiber-guide' );
	}

	public function get_icon() {
		return 'eicon-code';
	}

	public function get_categories() {
		return array( 'noga-mt', 'general' );
	}

	public function get_keywords() {
		return array( 'ufiber', 'noga', 'deburring', 'brush', 'speeds', 'feeds', 'rpm', 'selector' );
	}

	public function get_style_depends() {
		return array( 'nufg-embed' );
	}

	public function get_script_depends() {
		return array( 'nufg-embed' );
	}

	protected function register_controls() {
		$o = NUFG_Plugin::options();

		/* ---- Content ---- */
		$this->start_controls_section( 'section_content', array( 'label' => esc_html__( 'Guide', 'noga-ufiber-guide' ) ) );

		$this->add_control(
			'tab',
			array(
				'label'   => esc_html__( 'Start on', 'noga-ufiber-guide' ),
				'type'    => Controls_Manager::SELECT,
				'default' => $o['tab'],
				'options' => array(
					'find'     => esc_html__( 'Find a tool', 'noga-ufiber-guide' ),
					'speeds'   => esc_html__( 'Speeds & feeds', 'noga-ufiber-guide' ),
					'fix'      => esc_html__( 'Fix a problem', 'noga-ufiber-guide' ),
					'replace'  => esc_html__( 'Replace XEBEC', 'noga-ufiber-guide' ),
					'learn'    => esc_html__( 'Learn', 'noga-ufiber-guide' ),
					'products' => esc_html__( 'Products', 'noga-ufiber-guide' ),
				),
			)
		);

		$this->add_control(
			'units',
			array(
				'label'   => esc_html__( 'Default units', 'noga-ufiber-guide' ),
				'type'    => Controls_Manager::SELECT,
				'default' => $o['units'],
				'options' => array(
					'mm'   => esc_html__( 'Millimetres (mm)', 'noga-ufiber-guide' ),
					'inch' => esc_html__( 'Inches', 'noga-ufiber-guide' ),
				),
			)
		);

		$this->add_control(
			'brand',
			array(
				'label'        => esc_html__( 'Show NOGA MT logo bar', 'noga-ufiber-guide' ),
				'description'  => esc_html__( 'Turn off if your page header already shows the logo. The section tabs stay visible.', 'noga-ufiber-guide' ),
				'type'         => Controls_Manager::SWITCHER,
				'return_value' => '1',
				'default'      => $o['brand'] ? '1' : '',
			)
		);

		$this->end_controls_section();

		/* ---- Layout ---- */
		$this->start_controls_section( 'section_layout', array( 'label' => esc_html__( 'Layout', 'noga-ufiber-guide' ) ) );

		$this->add_control(
			'height_mode',
			array(
				'label'       => esc_html__( 'Height', 'noga-ufiber-guide' ),
				'type'        => Controls_Manager::SELECT,
				'default'     => 'auto',
				'options'     => array(
					'auto'  => esc_html__( 'Auto – grows with the content (recommended)', 'noga-ufiber-guide' ),
					'fixed' => esc_html__( 'Fixed – scrolls inside the box', 'noga-ufiber-guide' ),
				),
			)
		);

		$this->add_responsive_control(
			'fixed_height',
			array(
				'label'      => esc_html__( 'Box height', 'noga-ufiber-guide' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px', 'vh' ),
				'range'      => array(
					'px' => array( 'min' => 400, 'max' => 2000 ),
					'vh' => array( 'min' => 40, 'max' => 100 ),
				),
				'default'    => array( 'unit' => 'vh', 'size' => 85 ),
				'selectors'  => array( '{{WRAPPER}} .nufg--fixed .nufg__frame' => 'height: {{SIZE}}{{UNIT}};' ),
				'condition'  => array( 'height_mode' => 'fixed' ),
			)
		);

		$this->add_responsive_control(
			'min_height',
			array(
				'label'      => esc_html__( 'Minimum height', 'noga-ufiber-guide' ),
				'type'       => Controls_Manager::SLIDER,
				'size_units' => array( 'px' ),
				'range'      => array( 'px' => array( 'min' => 320, 'max' => 1200 ) ),
				'default'    => array( 'unit' => 'px', 'size' => 560 ),
				'selectors'  => array( '{{WRAPPER}} .nufg__frame' => 'min-height: {{SIZE}}{{UNIT}};' ),
			)
		);

		$this->add_control(
			'scroll_offset',
			array(
				'label'       => esc_html__( 'Scroll offset (sticky header height)', 'noga-ufiber-guide' ),
				'description' => esc_html__( 'When a visitor opens a new section while scrolled down, the page scrolls back to the top of the guide, leaving this much space for a sticky header.', 'noga-ufiber-guide' ),
				'type'        => Controls_Manager::NUMBER,
				'min'         => 0,
				'max'         => 400,
				'default'     => (int) $o['scroll_off'],
				'condition'   => array( 'height_mode' => 'auto' ),
			)
		);

		$this->end_controls_section();

		/* ---- Style ---- */
		$this->start_controls_section( 'section_style', array( 'label' => esc_html__( 'Frame', 'noga-ufiber-guide' ), 'tab' => Controls_Manager::TAB_STYLE ) );

		$this->add_group_control(
			Group_Control_Border::get_type(),
			array( 'name' => 'frame_border', 'selector' => '{{WRAPPER}} .nufg' )
		);

		$this->add_responsive_control(
			'frame_radius',
			array(
				'label'      => esc_html__( 'Border radius', 'noga-ufiber-guide' ),
				'type'       => Controls_Manager::DIMENSIONS,
				'size_units' => array( 'px', '%' ),
				'selectors'  => array(
					'{{WRAPPER}} .nufg, {{WRAPPER}} .nufg__frame' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
				),
			)
		);

		$this->add_group_control(
			Group_Control_Box_Shadow::get_type(),
			array( 'name' => 'frame_shadow', 'selector' => '{{WRAPPER}} .nufg' )
		);

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();

		$height = 'auto';
		if ( isset( $s['height_mode'] ) && 'fixed' === $s['height_mode'] ) {
			// The real height comes from the responsive control's CSS; this only marks the box as fixed.
			$height = '800px';
		}

		echo NUFG_Plugin::render_embed( // phpcs:ignore WordPress.Security.EscapeOutput
			array(
				'tab'        => isset( $s['tab'] ) ? $s['tab'] : 'find',
				'units'      => isset( $s['units'] ) ? $s['units'] : 'mm',
				'brand'      => ! empty( $s['brand'] ) ? 1 : 0,
				'height'     => $height,
				'min_height' => isset( $s['min_height']['size'] ) && $s['min_height']['size'] ? (int) $s['min_height']['size'] : 560,
				'offset'     => isset( $s['scroll_offset'] ) && '' !== $s['scroll_offset'] ? (int) $s['scroll_offset'] : 90,
			)
		);
	}
}
