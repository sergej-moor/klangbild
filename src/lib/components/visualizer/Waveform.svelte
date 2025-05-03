<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { audioBuffer, playbackPosition, isPlaying } from '$lib/audio/stores';
	import { seekToPosition } from '$lib/audio/controls';
	import { theme, sizes } from '$lib/theme';

	// Props
	const { compactMode = false } = $props();

	// Canvas references and state
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let width = $state(0);
	let height = $state(sizes.defaultHeight);
	let isReady = $state(false);
	let progress = $state(0); // Track progress locally

	// Animation frame ID for continuous updates
	let animationId: number;

	// Styling parameters for waveform
	const bgColor = 'transparent';
	const waveformColor = theme.accent;
	const progressColor = theme.primary;
	const lineWidth = compactMode ? 0.8 : 1.2;

	// Store full waveform data
	let fullWaveform = $state<Float32Array | null>(null);

	// Handle resize for responsiveness
	function handleResize() {
		if (!browser || !canvas || !ctx) return;

		const container = canvas.parentElement;
		if (container) {
			width = container.clientWidth;

			if (compactMode) {
				height = 40;
			} else {
				height = Math.min(sizes.defaultHeight, container.clientWidth / 2);
			}

			canvas.width = width;
			canvas.height = height;

			if (fullWaveform && fullWaveform.length > 0) {
				drawWaveform(fullWaveform, progress);
			}
		}
	}

	// Generate waveform data from audio buffer
	function generateWaveformData() {
		if (!$audioBuffer) return;

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
	}

	// Clear the canvas
	function clearCanvas() {
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);
	}

	// Setup continuous animation for progress updates
	function startProgressAnimation() {
		if (animationId) cancelAnimationFrame(animationId);

		function animate() {
			if (isReady && ctx && fullWaveform && fullWaveform.length > 0) {
				// Always get the latest progress directly from the store
				progress = $playbackPosition;
				drawWaveform(fullWaveform, progress);
			}
			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);
	}

	// Handle click on the waveform to seek
	function handleWaveformClick(event: MouseEvent) {
		if (!isReady || !canvas) return;

		const rect = canvas.getBoundingClientRect();

		// Calculate the click position relative to the canvas
		const x = event.clientX - rect.left;

		// Convert to a position between 0 and 1
		const position = x / rect.width;

		// Force seek regardless of playing state
		seekToPosition(position);
	}

	function drawWaveform(data: Float32Array, currentProgress: number) {
		if (!ctx || !canvas) return;

		// Clear the canvas
		clearCanvas();

		// Ensure we're using the entire data array
		if (!data || data.length === 0) return;

		// Calculate vertical scaling factor
		const verticalScale = height * (compactMode ? 0.6 : 0.4);
		const centerY = height / 2;
		
		// Calculate the progress position in pixels
		const progressPixel = width * currentProgress;
		
		// Draw the paths for both played and remaining portions
		ctx.lineWidth = lineWidth;
		ctx.lineJoin = 'round';
		
		// Helper function to draw a portion of the waveform
		const drawWaveformPortion = (start: number, end: number, color: string) => {
			if (start >= end) return;
			
			const sampleStep = data.length / width;
			
			// Create top path (above center)
			ctx.beginPath();
			ctx.strokeStyle = color;
			
			// Start at the center for the first point
			ctx.moveTo(start, centerY);
			
			// Draw the top curve
			for (let x = start; x < end; x++) {
				const dataIdx = Math.min(Math.floor(x * sampleStep), data.length - 1);
				const amplitude = data[dataIdx] * verticalScale;
				ctx.lineTo(x, centerY - amplitude);
			}
			
			// Draw back to center at the end
			ctx.lineTo(end, centerY);
			ctx.stroke();
			
			// Create bottom path (below center)
			ctx.beginPath();
			ctx.moveTo(start, centerY);
			
			// Draw the bottom curve (mirror of top)
			for (let x = start; x < end; x++) {
				const dataIdx = Math.min(Math.floor(x * sampleStep), data.length - 1);
				const amplitude = data[dataIdx] * verticalScale;
				ctx.lineTo(x, centerY + amplitude);
			}
			
			// Draw back to center at the end
			ctx.lineTo(end, centerY);
			ctx.stroke();
		};
		
		// Draw the played portion (with progress color)
		drawWaveformPortion(0, progressPixel, progressColor);
		
		// Draw the remaining portion (with regular waveform color)
		drawWaveformPortion(progressPixel, width, waveformColor);
		
		// Add a very thin vertical progress line
		ctx.beginPath();
		ctx.strokeStyle = progressColor;
		ctx.lineWidth = 0.5; // Much thinner line
		ctx.moveTo(progressPixel, 0);
		ctx.lineTo(progressPixel, height);
		ctx.stroke();
	}

	// Watch for audio buffer changes to generate the waveform
	$effect(() => {
		if ($audioBuffer) {
			generateWaveformData();
		}
	});

	// Watch for playback position changes
	$effect(() => {
		progress = $playbackPosition;
	});

	// Lifecycle hooks
	onMount(async () => {
		if (!browser) return;

		// Initialize canvas context
		ctx = canvas.getContext('2d')!;

		// Set up resize listener
		window.addEventListener('resize', handleResize);
		handleResize();

		// Add click event listener to the canvas
		canvas.addEventListener('click', handleWaveformClick);

		// Generate waveform data if already loaded
		if ($audioBuffer) {
			generateWaveformData();
		}

		// Mark as ready
		isReady = true;

		// Start animation
		startProgressAnimation();
	});

	onDestroy(() => {
		if (!browser) return;

		// Clean up event listeners and animation
		window.removeEventListener('resize', handleResize);
		if (canvas) {
			canvas.removeEventListener('click', handleWaveformClick);
		}
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	});
</script>

<div class="relative h-full w-full overflow-hidden rounded">
	<div
		class="mx-auto flex h-full w-full flex-col {compactMode ? 'gap-0' : 'gap-2'}"
		id="full-waveform"
	>
		<div class="w-full overflow-hidden rounded-md">
			<canvas bind:this={canvas} {width} {height} class="block h-full w-full cursor-pointer"
			></canvas>
		</div>
	</div>
</div>
