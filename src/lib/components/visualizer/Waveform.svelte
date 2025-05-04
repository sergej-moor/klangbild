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

	// Off-screen canvases for prerendering
	let playedWaveformCanvas: HTMLCanvasElement | null = null;
	let upcomingWaveformCanvas: HTMLCanvasElement | null = null;
	let hasPrerenderedWaveform = $state(false);

	// Animation frame ID for continuous updates
	let animationId: number;

	// Styling parameters for waveform
	const waveformColor = theme.primary;
	const progressColor = theme.primary;
	const lineWidth = compactMode ? 0.8 : 1.2;

	// Store full waveform data
	let fullWaveform = $state<Float32Array | null>(null);

	// Handle resize for responsiveness
	function handleResize() {
		if (!browser || !canvas || !ctx) return;

		const container = canvas.parentElement;
		if (container) {
			const newWidth = container.clientWidth;
			const newHeight = compactMode ? 40 : Math.min(sizes.defaultHeight, container.clientWidth / 2);
			
			// Only recreate prerendered canvases if dimensions change
			if (width !== newWidth || height !== newHeight) {
				width = newWidth;
				height = newHeight;
				canvas.width = width;
				canvas.height = height;
				
				// Reset prerendered flag so waveform will be redrawn
				hasPrerenderedWaveform = false;
				
				if (fullWaveform && fullWaveform.length > 0) {
					prerenderWaveform(fullWaveform);
				}
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
		
		// Reset pre-rendered flag
		hasPrerenderedWaveform = false;
	}

	// Clear the canvas
	function clearCanvas() {
		if (!ctx) return;
		ctx.clearRect(0, 0, width, height);
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
		
		// Draw played waveform on first canvas (theme.primary on transparent)
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

	// Setup continuous animation for progress updates
	function startProgressAnimation() {
		if (animationId) cancelAnimationFrame(animationId);

		function animate() {
			if (isReady && ctx && fullWaveform && fullWaveform.length > 0) {
				// Always get the latest progress directly from the store
				progress = $playbackPosition;
				
				// Prerender waveform if not already done
				if (!hasPrerenderedWaveform) {
					prerenderWaveform(fullWaveform);
				}
				
				// Draw the current state using prerendered images
				drawCurrentState(progress);
			}
			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);
	}
	
	// Draw the current state using prerendered waveforms
	function drawCurrentState(currentProgress: number) {
		if (!ctx || !playedWaveformCanvas || !upcomingWaveformCanvas) return;
		
		// Clear the canvas
		clearCanvas();
		
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

	// Watch for theme changes to trigger re-rendering
	$effect(() => {
		if (theme.primary || theme.background) {
			hasPrerenderedWaveform = false;
		}
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
		
		// Clean up prerendered canvases
		playedWaveformCanvas = null;
		upcomingWaveformCanvas = null;
	});
</script>

<div class="relative h-full w-full overflow-hidden">
	<div
		class="mx-auto flex h-full w-full flex-col {compactMode ? 'gap-0' : 'gap-2'}"
		id="full-waveform"
	>
		<div class="w-full overflow-hidden ">
			<canvas bind:this={canvas} {width} {height} class="block h-full w-full cursor-pointer"
			></canvas>
		</div>
	</div>
</div>
