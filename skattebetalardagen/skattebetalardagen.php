<?php
/**
 * Plugin Name: Skattebetalardagen
 * Description: Bädda in räknesnurran med shortcode [skattebetalardagen] eller [skattebetalardagen ar="2024"]
 * Version: 1.7
 * Author: Skattebetalarna
 */

add_shortcode('skattebetalardagen', function ($atts) {
    $atts = shortcode_atts(['ar' => ''], $atts, 'skattebetalardagen');
    $year = $atts['ar'];

    wp_enqueue_style(
        'skattebetalardagen',
        plugin_dir_url(__FILE__) . 'skattebetalardagen.css',
        [],
        '1.7'
    );
    wp_enqueue_script(
        'skattebetalardagen',
        plugin_dir_url(__FILE__) . 'skattebetalardagen.js',
        [],
        '1.7',
        true
    );

    $data_attr = $year ? ' data-ar="' . esc_attr($year) . '"' : '';
    return '<div id="skattebetalardagen"' . $data_attr . '></div>';
});
