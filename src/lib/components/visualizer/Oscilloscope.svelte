<script lang="ts">
	import { waveform, isPlaying } from '$lib/audio/stores';
	import { theme } from '$lib/theme';
	import BaseVisualizer from './BaseVisualizer.svelte';

	// Props
	export let orientation = 'horizontal'; // 'horizontal' or 'vertical'

	// References to canvas context
	let ctx: CanvasRenderingContext2D;
	let width = 0;
	let height = 0;
	let scale = 1;

	// Theme colors
	const lineColor = theme.primary;
	const lineWidth = 1;

	// Handle ready event from BaseVisualizer
	function handleReady(event: CustomEvent) {
		({ ctx, width, height, scale } = event.detail);
	}

	// Handle resize event from BaseVisualizer
	function handleResize(event: CustomEvent) {
		({ width, height, scale } = event.detail);
	}

	// Draw function with support for both horizontal and vertical orientations
	function drawOscilloscope() {
		if (!ctx) return;

		// Clear the canvas
		ctx.clearRect(0, 0, width, height);

		// Get the current waveform data
		let waveformData = $waveform;
		if (!waveformData || waveformData.length === 0) {
			return;
		}
		
		// Helper function to detect if we have an active signal
		function hasActiveSignal(data: Float32Array): boolean {
			return $isPlaying && data.some(val => Math.abs(val) > 0.001);
		}
		
		// Check if the audio is paused or waveform is flat (all zeros)
		const hasSignal = hasActiveSignal(waveformData);
		
		// Draw a flat line if there's no signal
		if (!hasSignal) {
			ctx.strokeStyle = lineColor;
			ctx.lineWidth = lineWidth;
			
			ctx.beginPath();
			if (orientation === 'horizontal') {
				const centerY = height / 2;
				ctx.moveTo(0, centerY);
				ctx.lineTo(width, centerY);
			} else {
				const centerX = width / 2;
				ctx.moveTo(centerX, 0);
				ctx.lineTo(centerX, height);
			}
			ctx.stroke();
			return;
		}

		// Downsample the waveform data to simulate a smaller FFT size (1024)
		// This makes the oscilloscope more responsive and focused
		const targetSize = 1024;
		if (waveformData.length > targetSize) {
			const downsampled = new Float32Array(targetSize);
			const step = Math.floor(waveformData.length / targetSize);

			for (let i = 0; i < targetSize; i++) {
				downsampled[i] = waveformData[i * step];
			}

			waveformData = downsampled;
		}

		// Setup line style
		ctx.strokeStyle = lineColor;
		ctx.lineWidth = lineWidth;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';

		// Begin path
		ctx.beginPath();

		if (orientation === 'horizontal') {
			// Horizontal mode (original)
			// Calculate the center line and amplitude scaling
			const centerY = height / 2;

			// Auto-scale amplitude based on available height and current scale factor
			const scaleFactor = ((height * 0.8) / 2) * scale;

			// Always stretch the waveform to fill the entire canvas width
			const step = waveformData.length / width;

			// Plot each point in the waveform
			for (let i = 0; i < width; i++) {
				// Calculate the data index for this x position
				const dataIndex = Math.min(waveformData.length - 1, Math.floor(i * step));

				// Get the waveform value (-1.0 to 1.0)
				const value = waveformData[dataIndex];

				// Calculate y position (invert and scale)
				const y = centerY - value * scaleFactor;

				// Plot the point
				if (i === 0) {
					ctx.moveTo(i, y);
				} else {
					ctx.lineTo(i, y);
				}
			}
		} else {
			// Vertical mode (top to bottom)
			// Calculate the center line and amplitude scaling
			const centerX = width / 2;

			// Auto-scale amplitude based on available width and current scale factor
			const scaleFactor = ((width * 0.8) / 2) * scale;

			// Stretch the waveform to fill the entire canvas height
			const step = waveformData.length / height;

			// Plot each point in the waveform (top to bottom)
			for (let i = 0; i < height; i++) {
				// Calculate the data index for this y position
				const dataIndex = Math.min(waveformData.length - 1, Math.floor(i * step));

				// Get the waveform value (-1.0 to 1.0)
				const value = waveformData[dataIndex];

				// Calculate x position (invert and scale)
				const x = centerX + value * scaleFactor;

				// Plot the point
				if (i === 0) {
					ctx.moveTo(x, i);
				} else {
					ctx.lineTo(x, i);
				}
			}
		}

		// Draw the line
		ctx.stroke();
	}
</script>

<BaseVisualizer
	on:ready={handleReady}
	on:resize={handleResize}
	id="oscilloscope"
	draw={drawOscilloscope}
/>
