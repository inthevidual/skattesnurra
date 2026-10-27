<?php
/**
 * Plugin Name: CPCharts
 * Description: Customisable chart blocks for the WordPress block editor.
 * Version: 1.0.0
 * Author: Skattebetalarna
 * License: GPL-2.0-or-later
 * Text Domain: cpcharts
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CPCHARTS_VERSION', '1.0.0' );
define( 'CPCHARTS_DIR', plugin_dir_path( __FILE__ ) );
define( 'CPCHARTS_URL', plugin_dir_url( __FILE__ ) );

/**
 * Register all chart blocks.
 */
function cpcharts_register_blocks() {
	if ( ! file_exists( CPCHARTS_DIR . 'build/blocks/stacked-bar' ) ) {
		return;
	}
	register_block_type( CPCHARTS_DIR . 'build/blocks/stacked-bar' );
}
add_action( 'init', 'cpcharts_register_blocks' );
