import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls, RichText } from '@wordpress/block-editor';
import {
	PanelBody,
	TextControl,
	RangeControl,
	Button,
	ColorPicker,
	Popover,
	SelectControl,
	__experimentalNumberControl as NumberControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';

/* ── Tiny color-swatch button ─────────────────────────────────────── */

function ColorSwatch( { color, onChange } ) {
	const [ open, setOpen ] = useState( false );
	return (
		<>
			<button
				type="button"
				className="cpcharts-color-swatch"
				style={ { background: color } }
				onClick={ () => setOpen( ! open ) }
				aria-label={ __( 'Pick color', 'cpcharts' ) }
			/>
			{ open && (
				<Popover onClose={ () => setOpen( false ) } placement="left-start">
					<div style={ { padding: 12 } }>
						<ColorPicker
							color={ color }
							onChangeComplete={ ( c ) => {
								onChange( c.hex );
							} }
							onChange={ ( c ) => {
								onChange( c );
							} }
						/>
					</div>
				</Popover>
			) }
		</>
	);
}

/* ── Chart preview (shared between editor & front-end via CSS) ───── */

function ChartPreview( { attributes } ) {
	const { title, unit, maxValue, scaleStep, barHeight, barRadius, segments, brackets } = attributes;

	const scaleLabels = [];
	const steps = Math.round( maxValue / scaleStep );
	for ( let i = 0; i <= steps; i++ ) {
		const val = i * scaleStep;
		scaleLabels.push( { val, pct: ( val / maxValue ) * 100 } );
	}

	return (
		<div className="cpcharts-stacked-bar">
			{ title && <p className="cpcharts-sb-title">{ title }</p> }

			{ brackets.length > 0 && (
				<div className="cpcharts-sb-brackets">
					{ brackets.map( ( b, bi ) => {
						let leftVal = 0;
						for ( let i = 0; i < b.fromSegment && i < segments.length; i++ ) {
							leftVal += segments[ i ].value;
						}
						let spanVal = 0;
						for ( let i = b.fromSegment; i <= b.toSegment && i < segments.length; i++ ) {
							spanVal += segments[ i ].value;
						}
						const leftPct = ( leftVal / maxValue ) * 100;
						const widthPct = ( spanVal / maxValue ) * 100;
						return (
							<div key={ bi } className="cpcharts-sb-bracket" style={ { left: leftPct + '%', width: widthPct + '%' } }>
								<span className="cpcharts-sb-bracket-label">{ b.label }</span>
								<svg className="cpcharts-sb-bracket-svg" viewBox="0 0 200 28" preserveAspectRatio="none">
									<path d="M0 24 C0 4, 0 4, 100 4 C200 4, 200 4, 200 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
								</svg>
							</div>
						);
					} ) }
				</div>
			) }

			<div className="cpcharts-sb-bar" style={ { height: barHeight, borderRadius: barRadius } }>
				{ segments.map( ( seg, i ) => {
					const pct = ( seg.value / maxValue ) * 100;
					const total = segments.reduce( ( s, x ) => s + x.value, 0 );
					let radius = '';
					if ( segments.length === 1 ) {
						radius = `${ barRadius }px`;
					} else if ( i === 0 ) {
						radius = `${ barRadius }px 0 0 ${ barRadius }px`;
					} else if ( i === segments.length - 1 && Math.abs( total - maxValue ) < 0.01 ) {
						radius = `0 ${ barRadius }px ${ barRadius }px 0`;
					}
					return (
						<div
							key={ i }
							className="cpcharts-sb-segment"
							style={ { width: pct + '%', background: seg.color, borderRadius: radius || undefined } }
						/>
					);
				} ) }
			</div>

			<div className="cpcharts-sb-scale">
				{ scaleLabels.map( ( s ) => (
					<span key={ s.val } className="cpcharts-sb-scale-label" style={ { left: s.pct + '%' } }>
						{ s.val.toLocaleString( 'sv-SE' ) } { unit }
					</span>
				) ) }
			</div>

			<div className="cpcharts-sb-legend">
				{ segments.map( ( seg, i ) => (
					<span key={ i } className="cpcharts-sb-legend-item">
						<span className="cpcharts-sb-legend-dot" style={ { background: seg.color } } />
						{ seg.label }: { seg.value.toLocaleString( 'sv-SE' ) } { unit }
					</span>
				) ) }
			</div>
		</div>
	);
}

/* ── Sidebar controls ─────────────────────────────────────────────── */

export function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();
	const { title, unit, maxValue, scaleStep, barHeight, barRadius, segments, brackets } = attributes;

	/* -- Segment helpers -- */

	function updateSegment( index, key, value ) {
		const next = segments.map( ( s, i ) => ( i === index ? { ...s, [ key ]: value } : s ) );
		setAttributes( { segments: next } );
	}

	function addSegment() {
		const palette = [ '#B5AD6F', '#006B5A', '#F58220', '#0072CE', '#7B5EA7', '#F9423A', '#2BA784', '#C9A471' ];
		setAttributes( {
			segments: [
				...segments,
				{
					label: `Segment ${ segments.length + 1 }`,
					value: 10,
					color: palette[ segments.length % palette.length ],
				},
			],
		} );
	}

	function removeSegment( index ) {
		setAttributes( { segments: segments.filter( ( _, i ) => i !== index ) } );
	}

	function moveSegment( index, dir ) {
		const next = [ ...segments ];
		const target = index + dir;
		if ( target < 0 || target >= next.length ) return;
		[ next[ index ], next[ target ] ] = [ next[ target ], next[ index ] ];
		setAttributes( { segments: next } );
	}

	/* -- Bracket helpers -- */

	function updateBracket( index, key, value ) {
		const next = brackets.map( ( b, i ) => ( i === index ? { ...b, [ key ]: value } : b ) );
		setAttributes( { brackets: next } );
	}

	function addBracket() {
		setAttributes( {
			brackets: [
				...brackets,
				{ label: __( 'Label', 'cpcharts' ), fromSegment: 0, toSegment: Math.min( 1, segments.length - 1 ) },
			],
		} );
	}

	function removeBracket( index ) {
		setAttributes( { brackets: brackets.filter( ( _, i ) => i !== index ) } );
	}

	/* -- Segment index options for bracket selects -- */
	const segmentOptions = segments.map( ( s, i ) => ( { label: `${ i + 1 }. ${ s.label }`, value: String( i ) } ) );

	return (
		<>
			<InspectorControls>
				{ /* -- General -- */ }
				<PanelBody title={ __( 'Chart settings', 'cpcharts' ) } initialOpen>
					<TextControl
						label={ __( 'Title', 'cpcharts' ) }
						value={ title }
						onChange={ ( v ) => setAttributes( { title: v } ) }
					/>
					<TextControl
						label={ __( 'Unit', 'cpcharts' ) }
						value={ unit }
						onChange={ ( v ) => setAttributes( { unit: v } ) }
					/>
					<RangeControl
						label={ __( 'Max value', 'cpcharts' ) }
						value={ maxValue }
						onChange={ ( v ) => setAttributes( { maxValue: v } ) }
						min={ 1 }
						max={ 10000 }
					/>
					<RangeControl
						label={ __( 'Scale step', 'cpcharts' ) }
						value={ scaleStep }
						onChange={ ( v ) => setAttributes( { scaleStep: v } ) }
						min={ 1 }
						max={ 5000 }
					/>
					<RangeControl
						label={ __( 'Bar height (px)', 'cpcharts' ) }
						value={ barHeight }
						onChange={ ( v ) => setAttributes( { barHeight: v } ) }
						min={ 24 }
						max={ 120 }
					/>
					<RangeControl
						label={ __( 'Corner radius (px)', 'cpcharts' ) }
						value={ barRadius }
						onChange={ ( v ) => setAttributes( { barRadius: v } ) }
						min={ 0 }
						max={ 32 }
					/>
				</PanelBody>

				{ /* -- Segments -- */ }
				<PanelBody title={ __( 'Segments', 'cpcharts' ) } initialOpen>
					{ segments.map( ( seg, i ) => (
						<div key={ i } className="cpcharts-segment-row">
							<div className="cpcharts-segment-row-header">
								<ColorSwatch
									color={ seg.color }
									onChange={ ( c ) => updateSegment( i, 'color', c ) }
								/>
								<strong>{ i + 1 }.</strong>
								<TextControl
									hideLabelFromVision
									label={ __( 'Label', 'cpcharts' ) }
									value={ seg.label }
									onChange={ ( v ) => updateSegment( i, 'label', v ) }
									__nextHasNoMarginBottom
								/>
							</div>
							<div className="cpcharts-segment-row-controls">
								<NumberControl
									label={ __( 'Value', 'cpcharts' ) }
									value={ seg.value }
									onChange={ ( v ) => updateSegment( i, 'value', parseFloat( v ) || 0 ) }
									min={ 0 }
									__nextHasNoMarginBottom
								/>
								<Button
									icon="arrow-up-alt2"
									label={ __( 'Move up', 'cpcharts' ) }
									onClick={ () => moveSegment( i, -1 ) }
									disabled={ i === 0 }
									size="small"
								/>
								<Button
									icon="arrow-down-alt2"
									label={ __( 'Move down', 'cpcharts' ) }
									onClick={ () => moveSegment( i, 1 ) }
									disabled={ i === segments.length - 1 }
									size="small"
								/>
								<Button
									icon="trash"
									label={ __( 'Remove', 'cpcharts' ) }
									isDestructive
									onClick={ () => removeSegment( i ) }
									size="small"
								/>
							</div>
						</div>
					) ) }
					<Button variant="secondary" onClick={ addSegment } style={ { marginTop: 8 } }>
						{ __( '+ Add segment', 'cpcharts' ) }
					</Button>
				</PanelBody>

				{ /* -- Brackets -- */ }
				<PanelBody title={ __( 'Bracket annotations', 'cpcharts' ) } initialOpen={ false }>
					{ brackets.map( ( b, i ) => (
						<div key={ i } className="cpcharts-bracket-row">
							<TextControl
								label={ __( 'Label', 'cpcharts' ) }
								value={ b.label }
								onChange={ ( v ) => updateBracket( i, 'label', v ) }
								__nextHasNoMarginBottom
							/>
							<div className="cpcharts-bracket-range">
								<SelectControl
									label={ __( 'From', 'cpcharts' ) }
									value={ String( b.fromSegment ) }
									options={ segmentOptions }
									onChange={ ( v ) => updateBracket( i, 'fromSegment', parseInt( v, 10 ) ) }
									__nextHasNoMarginBottom
								/>
								<SelectControl
									label={ __( 'To', 'cpcharts' ) }
									value={ String( b.toSegment ) }
									options={ segmentOptions }
									onChange={ ( v ) => updateBracket( i, 'toSegment', parseInt( v, 10 ) ) }
									__nextHasNoMarginBottom
								/>
							</div>
							<Button
								icon="trash"
								label={ __( 'Remove', 'cpcharts' ) }
								isDestructive
								onClick={ () => removeBracket( i ) }
								size="small"
							/>
						</div>
					) ) }
					<Button variant="secondary" onClick={ addBracket } style={ { marginTop: 8 } }>
						{ __( '+ Add bracket', 'cpcharts' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<ChartPreview attributes={ attributes } />
			</div>
		</>
	);
}
