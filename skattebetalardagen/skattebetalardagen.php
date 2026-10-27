<?php
/**
 * Plugin Name: Skattebetalardagen
 * Description: Bädda in räknesnurran med shortcode [skattebetalardagen] eller [skattebetalardagen ar="2024"]
 * Version: 1.9
 * Author: Skattebetalarna
 */

add_shortcode('skattebetalardagen', function ($atts) {
    $atts = shortcode_atts(['ar' => ''], $atts, 'skattebetalardagen');
    $year = $atts['ar'];

    // filemtime as version → new asset URL on every deploy, busts the
    // 30-day Loopia/browser cache on static files
    $dir = plugin_dir_path(__FILE__);
    wp_enqueue_style(
        'skattebetalardagen',
        plugin_dir_url(__FILE__) . 'skattebetalardagen.css',
        [],
        (string) filemtime($dir . 'skattebetalardagen.css')
    );
    wp_enqueue_script(
        'skattebetalardagen',
        plugin_dir_url(__FILE__) . 'skattebetalardagen.js',
        [],
        (string) filemtime($dir . 'skattebetalardagen.js'),
        true
    );

    $data_attr = $year ? ' data-ar="' . esc_attr($year) . '"' : '';
    return '<div id="skattebetalardagen"' . $data_attr . '></div>';
});
