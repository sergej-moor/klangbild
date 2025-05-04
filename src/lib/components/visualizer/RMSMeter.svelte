<script lang="ts">
	import { rmsLevels, isPlaying } from '$lib/audio/stores';
	import { calculateLevels } from '$lib/audio/visualizer';
	import { theme } from '$lib/theme';
	import BaseVisualizer from './BaseVisualizer.svelte';
	import { linearToDb, dbToPosition } from '$lib/audio/utils';

	// Props - removed debug prop
	const {} = $props();

	// References to canvas context
	let ctx: CanvasRenderingContext2D;
	let width = 0;
	let height = 0;
	let scale = 1;

	// Theme colors - using only primary and background colors
	const meterColor = theme.primary;
	const backgroundColor = theme.background;

	// Level thresholds for markers
	const LEVEL_THRESHOLDS = [
		{ dB: 0 }, // 0 dB (clip)
		{ dB: -3 }, // -3 dB
		{ dB: -6 }, // -6 dB
		{ dB: -12 }, // -12 dB
		{ dB: -24 }, // -24 dB
		{ dB: -48 } // -48 dB
	];

	// Add headroom above 0 dB and minimum displayable dB level
	const HEADROOM_DB = 6; // 6 dB of headroom above 0 dB
	const MIN_DB = -60;

	// Handle ready event from BaseVisualizer
	function handleReady(event: CustomEvent) {
		({ ctx, width, height, scale } = event.detail);
	}

	// Handle resize event from BaseVisualizer
	function handleResize(event: CustomEvent) {
		({ width, height, scale } = event.detail);
	}

	// Draw function - updated to dynamically change marker colors
	function drawMeter() {
		if (!ctx) return;

		// Make sure to update the levels only if playing
		if ($isPlaying) {
			calculateLevels();
		}

		// Clear the canvas
		ctx.clearRect(0, 0, width, height);

		// Get current values - handle both array and object formats for compatibility
		const rmsValues = $rmsLevels;
		let leftLevel = 0;
		let rightLevel = 0;

		if (Array.isArray(rmsValues)) {
			// Array format [left, right]
			leftLevel = rmsValues[0] || 0;
			rightLevel = rmsValues[1] || 0;
		} else if (typeof rmsValues === 'object' && rmsValues !== null) {
			// Object format {left, right}
			leftLevel = rmsValues.left || 0;
			rightLevel = rmsValues.right || 0;
		}

		// If not playing, force levels to zero regardless of what's in the store
		if (!$isPlaying) {
			leftLevel = 0;
			rightLevel = 0;
		}

		// Use average of left and right for mono display
		const monoRms = (leftLevel + rightLevel) / 2;

		// Convert to dB
		const rmsDb = linearToDb(monoRms);

		// Draw vertical meter
		const padding = Math.max(1, Math.floor(width * 0.05)); // Minimal padding
		const meterWidth = width - padding * 2;

		// Draw background
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(padding, padding, meterWidth, height - padding * 2);

		// Calculate RMS height and position
		const rmsHeight = (height - padding * 2) * dbToPosition(rmsDb, MIN_DB, HEADROOM_DB);
		const rmsY = height - padding - rmsHeight;

		// Draw RMS level
		ctx.fillStyle = meterColor;
		ctx.fillRect(padding, rmsY, meterWidth, rmsHeight);

		// Draw level markings
		ctx.lineWidth = 1;

		// Draw all level markings and labels with dynamic color
		LEVEL_THRESHOLDS.forEach((threshold) => {
			const y = height - padding - (height - padding * 2) * dbToPosition(threshold.dB, MIN_DB, HEADROOM_DB);
			
			// Determine if this marker is inside the meter or outside
			const isInsideMeter = y >= rmsY;
			
			// Set appropriate colors for line and text
			ctx.strokeStyle = isInsideMeter ? backgroundColor : meterColor;
			ctx.fillStyle = isInsideMeter ? backgroundColor : meterColor;
			
			// Draw the line
			ctx.beginPath();
			ctx.moveTo(padding, y);
			ctx.lineTo(width - padding, y);
			ctx.stroke();

			// Add dB labels with appropriate style
			ctx.font = threshold.dB === 0 ? 'bold 9px sans-serif' : '9px sans-serif';
			ctx.fillText(`${threshold.dB}dB`, padding + 2, y - 2);
		});
	}
</script>

<BaseVisualizer on:ready={handleReady} on:resize={handleResize} id="peak-meter" draw={drawMeter} />

<style>
	/* Add some styles to ensure the canvas parent takes full space */
	:global(#peak-meter) {
		height: 100%;
		width: 100%;
	}

	:global(#peak-meter canvas) {
		width: 100%;
		height: 100%;
	}
</style>
