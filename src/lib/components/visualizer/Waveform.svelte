<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { audioBuffer, playbackPosition, isPlaying } from '$lib/audio/stores';
	import { seekToPosition } from '$lib/audio/controls';
	import { theme, sizes } from '$lib/theme';
	import { drawReferenceLine } from '$lib/audio/visualizer';
	import { formatTime } from '$lib/audio/utils';
	import BaseVisualizer from './BaseVisualizer.svelte';

	// Props
	const { compactMode = false } = $props();

	// Canvas references and state
	let ctx: CanvasRenderingContext2D;
	let width = $state(0);
	let height = $state(sizes.defaultHeight);
	let isReady = $state(false);
	let progress = $state(0); // Track progress locally
	let mouseX = $state(-1);
	let mouseY = $state(-1);
	let isHovering = $state(false);
	let totalDuration = $state(0); // Track the total audio duration

	// Off-screen canvases for prerendering
	let playedWaveformCanvas: HTMLCanvasElement | null = null;
	let upcomingWaveformCanvas: HTMLCanvasElement | null = null;
	let hasPrerenderedWaveform = $state(false);

	// Styling parameters for waveform
	const waveformColor = theme.primary;
	const progressColor = theme.primary;
	const lineWidth = compactMode ? 0.8 : 1.2;
	const hoverLineColor = waveformColor; // Use primary color for hover line

	// Store full waveform data
	let fullWaveform = $state<Float32Array | null>(null);

	// Handle ready event from BaseVisualizer
	function handleReady(event: CustomEvent) {
		({ ctx, width, height } = event.detail);
		isReady = true;
		
		if ($audioBuffer) {
			generateWaveformData();
			totalDuration = $audioBuffer.duration;
		}
	}

	// Handle resize event from BaseVisualizer
	function handleResize(event: CustomEvent) {
		({ width, height } = event.detail);
		
		// Reset prerendered flag so waveform will be redrawn
		hasPrerenderedWaveform = false;
		
		if (fullWaveform && fullWaveform.length > 0) {
			prerenderWaveform(fullWaveform);
		}
	}

	// Handle mouse events
	function handleMouseMove(event: CustomEvent) {
		mouseX = event.detail.x;
		mouseY = event.detail.y;
		isHovering = true;
	}

	function handleMouseLeave() {
		isHovering = false;
	}

	function handleClick(event: CustomEvent) {
		if (!isReady) return;
		
		// Calculate the click position relative to the canvas width
		const position = mouseX / width;
		
		// Force seek regardless of playing state
		seekToPosition(position);
	}

	// Generate waveform data from audio buffer
	function generateWaveformData() {
		if (!$audioBuffer) return;

		// Store the total duration
		totalDuration = $audioBuffer.duration;

		// Use the first channel of audio data
		const rawData = $audioBuffer.getChannelData(0);
		const samples = rawData.length;

		// For detailed waveform, use more points while still keeping performance reasonable
		const downsampleFactor = Math.max(1, Math.floor(samples / 50000));
		const downsampledLength = Math.floor(samples / downsampleFactor);
		const data = new Float32Array(downsampledLength);

		// Take peak of each downsampled section
		for (let i = 0; i < downsampledLength; i++) {
			const start = i * downsampleFactor;
			const end = Math.min(start + downsampleFactor, samples);
			let max = 0;

			for (let j = start; j < end; j++) {
				const absolute = Math.abs(rawData[j]);
				if (absolute > max) max = absolute;
			}

			data[i] = max;
		}

		fullWaveform = data;
		
		// Reset pre-rendered flag
		hasPrerenderedWaveform = false;
	}
	
	// Prerender waveform to offscreen canvases
	function prerenderWaveform(data: Float32Array) {
		if (!data || data.length === 0 || !browser || width === 0 || height === 0) return;
		
		// Create offscreen canvases if they don't exist or need to be resized
		if (!playedWaveformCanvas) {
			playedWaveformCanvas = document.createElement('canvas');
		}
		if (!upcomingWaveformCanvas) {
			upcomingWaveformCanvas = document.createElement('canvas');
		}
		
		// Set dimensions
		playedWaveformCanvas.width = width;
		playedWaveformCanvas.height = height;
		upcomingWaveformCanvas.width = width;
		upcomingWaveformCanvas.height = height;
		
		// Get contexts
		const playedCtx = playedWaveformCanvas.getContext('2d')!;
		const upcomingCtx = upcomingWaveformCanvas.getContext('2d')!;
		
		// Calculate vertical scaling factor
		const verticalScale = height * (compactMode ? 0.6 : 0.4);
		const centerY = height / 2;
		
		// Clear canvases
		playedCtx.clearRect(0, 0, width, height);
		upcomingCtx.clearRect(0, 0, width, height);
		
		// Set line styles
		playedCtx.lineWidth = lineWidth;
		playedCtx.lineJoin = 'round';
		upcomingCtx.lineWidth = lineWidth;
		upcomingCtx.lineJoin = 'round';
		
		const sampleStep = data.length / width;
		
		// Draw played portion (inverted: theme.background waveform on theme.primary background)
		playedCtx.fillStyle = waveformColor; // Fill entire area with primary color first
		playedCtx.fillRect(0, 0, width, height);
		
		playedCtx.beginPath();
		playedCtx.fillStyle = theme.background; // Waveform in background color
		
		// Start at the center
		playedCtx.moveTo(0, centerY);
		
		// Draw the top curve
		for (let x = 0; x < width; x++) {
			const dataIdx = Math.min(Math.floor(x * sampleStep), data.length - 1);
			const amplitude = data[dataIdx] * verticalScale;
			playedCtx.lineTo(x, centerY - amplitude);
		}
		
		// Move to the end at the center
		playedCtx.lineTo(width, centerY);
		
		// Draw the bottom curve (going backwards)
		for (let x = width - 1; x >= 0; x--) {
			const dataIdx = Math.min(Math.floor(x * sampleStep), data.length - 1);
			const amplitude = data[dataIdx] * verticalScale;
			playedCtx.lineTo(x, centerY + amplitude);
		}
		
		// Close the path
		playedCtx.closePath();
		
		// Fill the path
		playedCtx.fill();
		
		// Optionally, add stroke for a cleaner outline
		playedCtx.strokeStyle = theme.background;
		playedCtx.stroke();
		
		// Draw upcoming waveform on second canvas (theme.primary waveform on theme.background)
		// First fill the entire area with the background color
		upcomingCtx.fillStyle = theme.background;
		upcomingCtx.fillRect(0, 0, width, height);
		
		// Then draw the primary-colored waveform
		upcomingCtx.beginPath();
		upcomingCtx.fillStyle = waveformColor; // Use primary color for waveform
		
		// Start at the center
		upcomingCtx.moveTo(0, centerY);
		
		// Draw the top curve
		for (let x = 0; x < width; x++) {
			const dataIdx = Math.min(Math.floor(x * sampleStep), data.length - 1);
			const amplitude = data[dataIdx] * verticalScale;
			upcomingCtx.lineTo(x, centerY - amplitude);
		}
		
		// Move to the end at the center
		upcomingCtx.lineTo(width, centerY);
		
		// Draw the bottom curve (going backwards)
		for (let x = width - 1; x >= 0; x--) {
			const dataIdx = Math.min(Math.floor(x * sampleStep), data.length - 1);
			const amplitude = data[dataIdx] * verticalScale;
			upcomingCtx.lineTo(x, centerY + amplitude);
		}
		
		// Close the path
		upcomingCtx.closePath();
		
		// Fill the path with primary color
		upcomingCtx.fill();
		
		// Optionally, add stroke for a cleaner outline
		upcomingCtx.strokeStyle = waveformColor;
		upcomingCtx.stroke();
		
		// Mark as prerendered
		hasPrerenderedWaveform = true;
	}
	
	// Calculate time at mouse position
	function getTimeAtPosition(x: number): number {
		if (totalDuration <= 0 || width <= 0) return 0;
		const position = Math.max(0, Math.min(1, x / width));
		return position * totalDuration;
	}
	
	// Draw time tooltip at hover position
	function drawTimeTooltip(x: number) {
		if (!ctx || totalDuration <= 0) return;
		
		const time = getTimeAtPosition(x);
		const formattedTime = formatTime(time);
		
		// Set up text styling
		ctx.font = '10px Arial';
		ctx.textAlign = 'center';
		const textWidth = ctx.measureText(formattedTime).width;
		const padding = 4;
		const tooltipWidth = textWidth + padding * 2;
		const tooltipHeight = 18;
		
		// Position tooltip at the mouse Y position
		let tooltipX = x;
		const tooltipY = mouseY;
		
		// Keep tooltip within canvas bounds
		if (tooltipX + tooltipWidth / 2 > width) {
			tooltipX = width - tooltipWidth / 2;
		} else if (tooltipX - tooltipWidth / 2 < 0) {
			tooltipX = tooltipWidth / 2;
		}
		
		// Make sure tooltip is visible and not cut off at top or bottom
		let adjustedY = tooltipY;
		if (adjustedY - tooltipHeight / 2 < 0) {
			// Too close to top, move down
			adjustedY = tooltipHeight / 2;
		} else if (adjustedY + tooltipHeight / 2 > height) {
			// Too close to bottom, move up
			adjustedY = height - tooltipHeight / 2;
		}
		
		// Draw tooltip background
		ctx.fillStyle = waveformColor;
		ctx.fillRect(
			tooltipX - tooltipWidth / 2,
			adjustedY - tooltipHeight / 2,
			tooltipWidth,
			tooltipHeight
		);
		
		// Draw tooltip text
		ctx.fillStyle = theme.background;
		ctx.fillText(formattedTime, tooltipX, adjustedY + 4);
	}
	
	// Main draw function for the visualizer
	function drawWaveform() {
		if (!ctx || !isReady) return;
		
		// Get latest progress
		progress = $playbackPosition;
		
		// Ensure waveform is prerendered
		if (!hasPrerenderedWaveform && fullWaveform && fullWaveform.length > 0) {
			prerenderWaveform(fullWaveform);
		}
		
		// Draw the current state
		drawCurrentState(progress);
		
		// Draw hover line and tooltip if hovering
		if (isHovering && mouseX >= 0) {
			drawHoverLine();
			drawTimeTooltip(mouseX);
		}
	}
	
	// Draw the current state using prerendered waveforms
	function drawCurrentState(currentProgress: number) {
		if (!ctx || !playedWaveformCanvas || !upcomingWaveformCanvas) return;
		
		// Clear the canvas
		ctx.clearRect(0, 0, width, height);
		
		// Calculate the progress position in pixels
		const progressPixel = Math.floor(width * currentProgress);
		
		// Fill with background color
		ctx.fillStyle = theme.background;
		ctx.fillRect(0, 0, width, height);
		
		// Draw the played portion from the played waveform canvas (limited by progress)
		ctx.drawImage(
			playedWaveformCanvas,
			0, 0, progressPixel, height,  // Source rectangle
			0, 0, progressPixel, height   // Destination rectangle
		);
		
		// Draw the upcoming portion from the upcoming waveform canvas
		if (progressPixel < width) {
			ctx.drawImage(
				upcomingWaveformCanvas,
				progressPixel, 0, width - progressPixel, height,  // Source rectangle
				progressPixel, 0, width - progressPixel, height   // Destination rectangle
			);
		}
		
		// Add a very thin vertical progress line
		ctx.beginPath();
		ctx.strokeStyle = progressColor;
		ctx.lineWidth = 0.5; // Much thinner line
		ctx.moveTo(progressPixel, 0);
		ctx.lineTo(progressPixel, height);
		ctx.stroke();
	}
	
	// Draw hover line using the visualizer utility
	function drawHoverLine() {
		if (!ctx) return;
		
		// Use utility function from visualizer.ts
		drawReferenceLine(ctx, mouseX, height, hoverLineColor, 0.8);
	}

	// Watch for audio buffer changes to generate the waveform
	$effect(() => {
		if ($audioBuffer) {
			generateWaveformData();
			totalDuration = $audioBuffer.duration;
		}
	});

	// Watch for playback position changes
	$effect(() => {
		progress = $playbackPosition;
	});

	// Watch for theme changes to trigger re-rendering
	$effect(() => {
		if (theme.primary || theme.background) {
			hasPrerenderedWaveform = false;
		}
	});

	// Clean up when component is destroyed
	onDestroy(() => {
		if (!browser) return;
		
		// Clean up prerendered canvases
		playedWaveformCanvas = null;
		upcomingWaveformCanvas = null;
	});
</script>

<div class="relative h-full w-full overflow-hidden">
	<BaseVisualizer
		on:ready={handleReady}
		on:resize={handleResize}
		on:mousemove={handleMouseMove}
		on:mouseleave={handleMouseLeave}
		on:click={handleClick}
		draw={drawWaveform}
		id="waveform-visualizer"
	/>
</div>
