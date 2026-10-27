<?php
/**
 * Server-side render for cpcharts/stacked-bar.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 */

$title      = esc_html( $attributes['title'] ?? '' );
$unit       = esc_html( $attributes['unit'] ?? 'kr' );
$max_value  = (float) ( $attributes['maxValue'] ?? 100 );
$scale_step = (float) ( $attributes['scaleStep'] ?? 20 );
$bar_height = (int) ( $attributes['barHeight'] ?? 64 );
$bar_radius = (int) ( $attributes['barRadius'] ?? 6 );
$segments   = $attributes['segments'] ?? [];
$brackets   = $attributes['brackets'] ?? [];

if ( empty( $segments ) ) {
	return;
}

$total = array_sum( array_column( $segments, 'value' ) );
$wrapper_attrs = get_block_wrapper_attributes( [ 'class' => 'cpcharts-stacked-bar' ] );
?>
<div <?php echo $wrapper_attrs; ?>>

	<?php if ( $title ) : ?>
		<p class="cpcharts-sb-title"><?php echo $title; ?></p>
	<?php endif; ?>

	<?php if ( ! empty( $brackets ) ) : ?>
		<div class="cpcharts-sb-brackets">
			<?php foreach ( $brackets as $bracket ) :
				$b_label = esc_html( $bracket['label'] ?? '' );
				$b_from  = (int) ( $bracket['fromSegment'] ?? 0 );
				$b_to    = (int) ( $bracket['toSegment'] ?? 0 );

				// Calculate left% and width% from segment values
				$left_val = 0;
				for ( $i = 0; $i < $b_from && $i < count( $segments ); $i++ ) {
					$left_val += (float) $segments[ $i ]['value'];
				}
				$span_val = 0;
				for ( $i = $b_from; $i <= $b_to && $i < count( $segments ); $i++ ) {
					$span_val += (float) $segments[ $i ]['value'];
				}

				$left_pct  = ( $left_val / $max_value ) * 100;
				$width_pct = ( $span_val / $max_value ) * 100;
			?>
				<div class="cpcharts-sb-bracket" style="left:<?php echo $left_pct; ?>%;width:<?php echo $width_pct; ?>%">
					<span class="cpcharts-sb-bracket-label"><?php echo $b_label; ?></span>
					<svg class="cpcharts-sb-bracket-svg" viewBox="0 0 200 28" preserveAspectRatio="none">
						<path d="M0 24 C0 4, 0 4, 100 4 C200 4, 200 4, 200 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
					</svg>
				</div>
			<?php endforeach; ?>
		</div>
	<?php endif; ?>

	<div class="cpcharts-sb-bar" style="height:<?php echo $bar_height; ?>px;border-radius:<?php echo $bar_radius; ?>px">
		<?php foreach ( $segments as $i => $seg ) :
			$seg_value = (float) $seg['value'];
			$seg_color = esc_attr( $seg['color'] ?? '#ccc' );
			$seg_pct   = ( $seg_value / $max_value ) * 100;

			$radius_style = '';
			if ( count( $segments ) === 1 ) {
				$radius_style = "border-radius:{$bar_radius}px";
			} elseif ( $i === 0 ) {
				$radius_style = "border-radius:{$bar_radius}px 0 0 {$bar_radius}px";
			} elseif ( $i === count( $segments ) - 1 ) {
				// Only round right side if this is the last segment AND fills to the edge
				$running_total = 0;
				foreach ( $segments as $s ) {
					$running_total += (float) $s['value'];
				}
				if ( abs( $running_total - $max_value ) < 0.01 ) {
					$radius_style = "border-radius:0 {$bar_radius}px {$bar_radius}px 0";
				}
			}
		?>
			<div class="cpcharts-sb-segment"
				 style="width:<?php echo $seg_pct; ?>%;background:<?php echo $seg_color; ?>;<?php echo $radius_style; ?>">
			</div>
		<?php endforeach; ?>
	</div>

	<div class="cpcharts-sb-scale">
		<?php
		$steps = (int) round( $max_value / $scale_step );
		for ( $i = 0; $i <= $steps; $i++ ) :
			$val = $i * $scale_step;
			$pct = ( $val / $max_value ) * 100;
		?>
			<span class="cpcharts-sb-scale-label" style="left:<?php echo $pct; ?>%">
				<?php echo number_format( $val, 0, ',', "\u{2009}" ) . ' ' . $unit; ?>
			</span>
		<?php endfor; ?>
	</div>

	<div class="cpcharts-sb-legend">
		<?php foreach ( $segments as $seg ) :
			$seg_label = esc_html( $seg['label'] ?? '' );
			$seg_color = esc_attr( $seg['color'] ?? '#ccc' );
			$seg_value = (float) $seg['value'];
		?>
			<span class="cpcharts-sb-legend-item">
				<span class="cpcharts-sb-legend-dot" style="background:<?php echo $seg_color; ?>"></span>
				<?php echo $seg_label . ': ' . number_format( $seg_value, 0, ',', "\u{2009}" ) . ' ' . $unit; ?>
			</span>
		<?php endforeach; ?>
	</div>

</div>
