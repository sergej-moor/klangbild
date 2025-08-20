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
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';

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
	const historyLength = 100;

	// Number of frequency bands to display
	const NUM_BANDS = 64;

	// Frequency range constants - human hearing range
	const MIN_FREQ = 10; // 20 Hz is typically the lower limit of human hearing
	const MAX_FREQ_MULTIPLIER = 0.5; // Nyquist frequency (half sample rate)

	// Pre-calculate band edge frequencies and mapping
	let bandEdges: number[] = [];
	let bandBinRanges: { start: number; end: number }[] = [];
	
	// Optimization: Cache band intensity calculations for each spectrum
	let bandIntensityCache = new Map<Uint8Array, number[]>();
	
	// Optimization: Precomputed color cache - reduced to 128 levels for performance
	let colorCache: string[] = [];
	
	// Number of color levels to use (128 instead of 256 for better performance)
	const COLOR_LEVELS = 128;

	// Handle ready event from BaseVisualizer
	function handleReady(event: CustomEvent) {
		({ ctx, width, height, scale } = event.detail);
		initFrequencyBands();
		initColorCache();

	}

	// Handle resize event from BaseVisualizer
	function handleResize(event: CustomEvent) {
		({ width, height, scale } = event.detail);

	}
	
	// Initialize color cache for faster rendering with reduced color levels
	function initColorCache() {
		// Precompute colors for 128 intensity values instead of 256
		colorCache = new Array(COLOR_LEVELS);
		for (let i = 0; i < COLOR_LEVELS; i++) {
			// Map 0-127 to 0-255 for calculating colors
			const mappedValue = Math.floor((i / (COLOR_LEVELS - 1)) * 255);
			colorCache[i] = getColor(mappedValue);
		}
	}
	
	// Handle mousemove event from BaseHoverableVisualizer
	function handleMouseMove(event: CustomEvent) {
		// Adjust coordinates based on the scale transformation (0.98 on hover)
		const scaleAdjustment = 1 / 0.98; // ~1.0204
		
		// The BaseHoverableVisualizer now tracks mouse state for us
		mouseX = event.detail.mouseX * scaleAdjustment;
		mouseY = event.detail.mouseY * scaleAdjustment;
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
		
		// Clear cache since bands changed
		bandIntensityCache.clear();
	}

	// Function to get average intensity for a band with caching
	function getBandIntensity(spectrum: Uint8Array, bandIndex: number): number {
		// Check if we already have cached intensities for this spectrum
		let bandIntensities = bandIntensityCache.get(spectrum);
		
		// If not cached, calculate all bands at once and cache them
		if (!bandIntensities) {
			bandIntensities = new Array(NUM_BANDS);
			
			// Calculate all band intensities for this spectrum
			for (let band = 0; band < NUM_BANDS; band++) {
				const range = bandBinRanges[band];
				
				// Optimization: For narrow bands, use max value instead of average
				if (range.end - range.start <= 3) {
					let max = 0;
					for (let i = range.start; i <= range.end; i++) {
						if (spectrum[i] > max) max = spectrum[i];
					}
					bandIntensities[band] = max;
					continue;
				}
				
				// For wider bands, use sampling
				const step = Math.max(1, Math.ceil((range.end - range.start) / 8));
				let sum = 0;
				let count = 0;
				
				for (let i = range.start; i <= range.end; i += step) {
					sum += spectrum[i];
					count++;
				}
				
				bandIntensities[band] = count > 0 ? Math.round(sum / count) : 0;
			}
			
			// Store in cache
			bandIntensityCache.set(spectrum, bandIntensities);
		}
		
		// Return the cached value
		return bandIntensities[bandIndex];
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

	// Main draw function - direct drawing to canvas without offscreen buffer 
	function drawSpectrogram() {
		if (!ctx) return;
		
		// Clear the canvas
		ctx.clearRect(0, 0, width, height);
		
		// Disable antialiasing for crisp pixel rendering
		ctx.imageSmoothingEnabled = false;
		
		// Update the spectrogramData if playing
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
		
		// Draw the spectrogram history
		if (spectrogramData.length > 0) {
			// Calculate the vertical height of each frequency band
			const bandHeight = height / NUM_BANDS;
			
			// Calculate the horizontal width of each time slice
			const timeWidth = width / historyLength;
			
			// Draw each time slice from oldest to newest (left to right)
			for (let timeIndex = 0; timeIndex < spectrogramData.length; timeIndex++) {
				// Calculate the x position for this time slice
				const timeRatio = timeIndex / Math.min(historyLength, spectrogramData.length);
				const x = Math.floor(width * timeRatio); // Floor to align with pixels
				
				// Calculate width to ensure no gaps between slices
				const nextX = timeIndex < spectrogramData.length - 1 
					? Math.floor(width * (timeIndex + 1) / Math.min(historyLength, spectrogramData.length))
					: width;
				const sliceWidth = Math.max(1, nextX - x);
				
				// Get the spectrum data for this time slice
				const spectrumAtTime = spectrogramData[timeIndex];
				
				// Draw each frequency band for this time slice
				for (let bandIndex = 0; bandIndex < NUM_BANDS; bandIndex++) {
					// Calculate the y position (invert to put low frequencies at the bottom)
					const yPos = Math.floor(height - (bandIndex + 1) * bandHeight); // Floor for pixel alignment
					
					// Calculate height to ensure no gaps between bands
					const nextY = bandIndex < NUM_BANDS - 1 
						? Math.floor(height - (bandIndex + 2) * bandHeight)
						: 0;
					const actualBandHeight = yPos - nextY;
					
					// Get the intensity value for this band
					const intensity = getBandIntensity(spectrumAtTime, bandIndex);
					
					// Get the color from cache - map 0-255 intensity to 0-127 color index
					const colorIndex = intensity >> 1; // Bit shift right by 1 is the same as dividing by 2
					ctx.fillStyle = colorCache[colorIndex];
					
					// Draw the rectangle for this band with adjusted dimensions to prevent gaps
					ctx.fillRect(x, nextY, sliceWidth, actualBandHeight);
				}
			}
		}
		
		// Draw crosshair lines when hovering
		if (isHovering && mouseX >= 0 && mouseY >= 0) {
			// Draw horizontal line
			drawCrosshairLine(0, mouseY, width, mouseY);
			
			// Draw vertical line
			drawCrosshairLine(mouseX, 0, mouseX, height);
		}
		
		// Draw hover label if mouse is over the canvas
		if (isHovering) {
			// Save canvas state to preserve drawing
			ctx.save();
			
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
			
			// Restore canvas state
			ctx.restore();
		}
	}
	
	// Function to draw a solid crosshair line
	function drawCrosshairLine(x1: number, y1: number, x2: number, y2: number) {
		if (!ctx) return;
		
		// Draw simple line with primary color without shadow
		ctx.strokeStyle = theme.primary;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	// Helper function to convert hex color to RGB components
	function hexToRgb(hex: string): string {
		// Remove # if present
		hex = hex.replace(/^#/, '');
		
		// Parse hex values
		const r = parseInt(hex.substring(0, 2), 16);
		const g = parseInt(hex.substring(2, 4), 16);
		const b = parseInt(hex.substring(4, 6), 16);
		
		return `${r}, ${g}, ${b}`;
	}

	// Listen for sample rate changes to reinitialize bands
	$effect(() => {
		if ($sampleRate) {
			initFrequencyBands();
		}
	});
	
	// Listen for theme changes to reinitialize color cache
	$effect(() => {
		if (theme.primary || theme.background) {
			// Theme changed, reinitialize color cache
			initColorCache();
		}
	});
	
	// Clean up when component is destroyed
	onDestroy(() => {
		// Clear caches
		bandIntensityCache.clear();
		colorCache = [];
	});
</script>

<BaseHoverableVisualizer
	on:ready={handleReady}
	on:resize={handleResize}
	on:mousemove={handleMouseMove}
	on:mouseleave={handleMouseLeave}
	id="spectrogram"
	title="Spectrogram"
	titlePosition="right"
	draw={drawSpectrogram}
/>
