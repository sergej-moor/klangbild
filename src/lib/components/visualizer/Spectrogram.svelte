<script lang="ts">
	import { spectrum, isPlaying, sampleRate } from '$lib/audio/stores';
	import { theme } from '$lib/theme';
	import BaseHoverableVisualizer from './BaseHoverableVisualizer.svelte';
	import { 
		blendColors, 
		drawFrequencyTooltip, 
		formatFrequency
	} from '$lib/audio/visualizer';
	import { formatNote } from '$lib/audio/utils';

	// Props - removed debug prop
	const {} = $props();

	// References to canvas context
	let ctx: CanvasRenderingContext2D;
	let width = 0;
	let height = 0;
	let scale = 1;
	let spectrogramData: Uint8Array[] = [];

	// Mouse position tracking
	let mouseX = -1;
	let mouseY = -1;
	let isHovering = false;
	let hoverFrequency = 0;

	// Number of history frames to keep
	const historyLength = 200;

	// Number of frequency bands to display
	const NUM_BANDS = 128;

	// Frequency range constants - human hearing range
	const MIN_FREQ = 20; // 20 Hz is typically the lower limit of human hearing
	const MAX_FREQ_MULTIPLIER = 0.5; // Nyquist frequency (half sample rate)

	// Pre-calculate band edge frequencies and mapping
	let bandEdges: number[] = [];
	let bandBinRanges: { start: number; end: number }[] = [];

	// Handle ready event from BaseVisualizer
	function handleReady(event: CustomEvent) {
		({ ctx, width, height, scale } = event.detail);
		initFrequencyBands();
	}

	// Handle resize event from BaseVisualizer
	function handleResize(event: CustomEvent) {
		({ width, height, scale } = event.detail);
	}
	
	// Handle mousemove event from BaseHoverableVisualizer
	function handleMouseMove(event: CustomEvent) {
		// The BaseHoverableVisualizer now tracks mouse state for us
		mouseX = event.detail.mouseX;
		mouseY = event.detail.mouseY;
		isHovering = event.detail.isHovering;
		
		// Calculate the frequency at the mouse position
		updateHoverFrequency();
	}
	
	// Handle mouseleave event from BaseHoverableVisualizer
	function handleMouseLeave(event: CustomEvent) {
		isHovering = event.detail.isHovering; // Should be false
	}
	
	// Calculate the frequency at current mouse position
	function updateHoverFrequency() {
		if (!isHovering || mouseY < 0 || mouseY >= height || bandEdges.length === 0) {
			return;
		}
		
		// Calculate the band index based on mouse Y position
		// Note: Frequencies are displayed from bottom (low) to top (high)
		const invertedY = height - mouseY; // Invert Y because bands are drawn from bottom up
		const bandHeight = height / NUM_BANDS;
		const bandIndex = Math.floor(invertedY / bandHeight);
		
		// Ensure bandIndex is within valid range
		const clampedBandIndex = Math.max(0, Math.min(NUM_BANDS - 1, bandIndex));
		
		// Get the frequency at this band
		// We can use the lower edge of the band for simplicity
		hoverFrequency = bandEdges[clampedBandIndex];
	}

	// Function to initialize frequency bands
	function initFrequencyBands() {
		const actualSampleRate = $sampleRate || 44100;
		const nyquist = actualSampleRate * MAX_FREQ_MULTIPLIER;

		// Generate logarithmically-spaced band edge frequencies
		bandEdges = new Array(NUM_BANDS + 1);
		for (let i = 0; i <= NUM_BANDS; i++) {
			// Calculate band edge frequency using logarithmic spacing
			const t = i / NUM_BANDS;
			bandEdges[i] = MIN_FREQ * Math.pow(nyquist / MIN_FREQ, t);
		}

		// Pre-calculate which spectrum bins correspond to each band
		const binCount = $spectrum ? $spectrum.length : 1024; // Default to 1024 if not available
		bandBinRanges = new Array(NUM_BANDS);

		for (let bandIndex = 0; bandIndex < NUM_BANDS; bandIndex++) {
			// Convert edge frequencies to bin indices
			const lowFreq = bandEdges[bandIndex];
			const highFreq = bandEdges[bandIndex + 1];

			// Calculate which bins in the FFT data correspond to these frequencies
			const lowBin = Math.floor((lowFreq / nyquist) * binCount);
			const highBin = Math.min(binCount - 1, Math.ceil((highFreq / nyquist) * binCount));

			bandBinRanges[bandIndex] = { start: lowBin, end: highBin };
		}
	}

	// Function to get average intensity for a band
	function getBandIntensity(spectrum: Uint8Array, bandIndex: number): number {
		const range = bandBinRanges[bandIndex];
		let sum = 0;
		let count = 0;

		// Sum up the values in this frequency range
		for (let i = range.start; i <= range.end; i++) {
			sum += spectrum[i];
			count++;
		}

		// Return the average intensity
		return count > 0 ? Math.round(sum / count) : 0;
	}

	// Color gradient for intensity representation
	function getColor(value: number): string {
		// Use a more balanced conversion for better dynamic range
		const norm = value / 255;

		// Apply power curve to emphasize higher values
		const factor = Math.pow(norm, 1.4);

		// Create color blend with a very subtle start color difference from background
		return blendColors(theme.background, theme.primary, factor, 1.0);
	}

	// Draw function - no changes needed here as debug is handled by BaseVisualizer
	function drawSpectrogram() {
		if (!ctx) return;

		// Clear the canvas
		ctx.clearRect(0, 0, width, height);

		// Add the latest spectrum data if playing
		if ($isPlaying && $spectrum && $spectrum.length > 0) {
			// Make a copy of the current spectrum
			const currentSpectrum = new Uint8Array($spectrum);

			// Add to history
			spectrogramData.push(currentSpectrum);

			// Limit history length
			if (spectrogramData.length > historyLength) {
				spectrogramData.shift();
			}
		}

		// Draw the spectrogram
		if (spectrogramData.length > 0) {
			// Calculate the vertical height of each frequency band
			const bandHeight = height / NUM_BANDS;

			// Calculate the horizontal width of each time slice
			const timeWidth = width / historyLength;

			// Ensure at least 1 pixel width
			const sliceWidth = Math.max(1, timeWidth);

			// Draw each time slice from oldest to newest (left to right)
			for (let timeIndex = 0; timeIndex < spectrogramData.length; timeIndex++) {
				// Calculate the x position for this time slice
				const timeRatio = timeIndex / Math.min(historyLength, spectrogramData.length);
				const x = width * timeRatio;

				// Get the spectrum data for this time slice
				const spectrumAtTime = spectrogramData[timeIndex];

				// Draw each frequency band for this time slice
				for (let bandIndex = 0; bandIndex < NUM_BANDS; bandIndex++) {
					// Calculate the y position (invert to put low frequencies at the bottom)
					const yPos = height - (bandIndex + 1) * bandHeight;

					// Get the intensity value for this band
					const intensity = getBandIntensity(spectrumAtTime, bandIndex);

					// Get the color based on intensity
					ctx.fillStyle = getColor(intensity);

					// Draw the rectangle for this band
					ctx.fillRect(x, yPos, sliceWidth, bandHeight);
				}
			}
		}

		// Draw hover label if mouse is over the canvas
		if (isHovering) {
			drawFrequencyTooltip({
				ctx,
				x: mouseX,
				y: mouseY,
				width,
				frequency: hoverFrequency,
				backgroundColor: theme.primary,
				textColor: theme.background,
				showNote: true,
				formatNote
			});
		}
	}

	// Listen for sample rate changes to reinitialize bands
	$effect(() => {
		if ($sampleRate) {
			initFrequencyBands();
		}
	});
</script>

<BaseHoverableVisualizer
	on:ready={handleReady}
	on:resize={handleResize}
	on:mousemove={handleMouseMove}
	on:mouseleave={handleMouseLeave}
	id="spectrogram"
	draw={drawSpectrogram}
/>
