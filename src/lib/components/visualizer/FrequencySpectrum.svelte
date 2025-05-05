<script lang="ts">
	import { spectrum, sampleRate, isPlaying } from '$lib/audio/stores';
	import { theme } from '$lib/theme';
	import BaseHoverableVisualizer from './BaseHoverableVisualizer.svelte';
	import { 
		blendColors, 
		drawFrequencyTooltip, 
		drawReferenceLine,
		formatFrequency
	} from '$lib/audio/visualizer';
	import { browser } from '$app/environment';
	import { formatNote } from '$lib/audio/utils';

	// Props - removed debug prop
	const {} = $props();

	// References to canvas context
	let ctx: CanvasRenderingContext2D;
	let width = 0;
	let height = 0;
	let scale = 1;

	// Mouse position tracking
	let mouseX = -1;
	let mouseY = -1;
	let isHovering = false;
	let hoverFrequency = 0;
	
	// Track the loudest frequency
	let peakFrequency = 0;
	let peakAmplitude = 0;
	let peakX = 0;

	// Frequency scaling - back to original value but with better interpolation
	const freqScalingPower = 3.0; // Controls logarithmic curve
	const minFreqPercent = 0.001; // Start from very low frequencies

	// Responsive height scaling factor
	let isSmallScreen = false;
	let heightScaleFactor = 1;

	// Previous spectrum data for temporal smoothing
	let prevSpectrum: number[] = [];
	// Smoothing factor (0-1), higher = more smoothing between frames
	const temporalSmoothing = 0.5;

	// Gradient intensity settings
	const intensityPower = 3.0; // Higher value makes gradient more intense (was 1.5)
	const minAlpha = 0.05; // Lower minimum alpha makes lower frequencies less visible (was 0.2)
	const alphaRange = 0.95; // Higher range creates more contrast (was 0.8)

	// Check screen size on mount and resize
	function checkScreenSize() {
		if (browser) {
			isSmallScreen = window.innerWidth < 768;
			heightScaleFactor = isSmallScreen ? 2 : 1;
		}
	}

	// Handle ready event from BaseVisualizer
	function handleReady(event: CustomEvent) {
		({ ctx, width, height, scale } = event.detail);
		checkScreenSize();
	}

	// Handle resize event from BaseVisualizer
	function handleResize(event: CustomEvent) {
		({ width, height, scale } = event.detail);
		checkScreenSize();
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
		if (!isHovering || mouseX < 0 || mouseX >= width) {
			return;
		}
		
		// Convert X position to frequency using the same scaling as the spectrum
		const xPercent = mouseX / width;
		const logPos = minFreqPercent + (1 - minFreqPercent) * Math.pow(xPercent, freqScalingPower);
		
		// Calculate frequency based on sample rate
		const nyquist = ($sampleRate || 44100) / 2;
		hoverFrequency = logPos * nyquist;
	}
	
	// Calculate frequency from x position
	function xToFrequency(x: number): number {
		const xPercent = x / width;
		const logPos = minFreqPercent + (1 - minFreqPercent) * Math.pow(xPercent, freqScalingPower);
		const nyquist = ($sampleRate || 44100) / 2;
		return logPos * nyquist;
	}

	// Cubic interpolation function for smoother curves
	function cubicInterpolate(y0: number, y1: number, y2: number, y3: number, mu: number) {
		const mu2 = mu * mu;
		const a0 = y3 - y2 - y0 + y1;
		const a1 = y0 - y1 - a0;
		const a2 = y2 - y0;
		const a3 = y1;
		return a0 * mu * mu2 + a1 * mu2 + a2 * mu + a3;
	}

	// Enhanced color blending function for more dramatic gradient
	function intensifyColor(amplitude: number) {
		// Apply a steeper power curve to make peaks pop
		const factor = Math.pow(amplitude, intensityPower);

		// Almost invisible at low amplitudes, high contrast at peaks
		const alpha = minAlpha + factor * alphaRange;

		// Use more vivid color for peaks
		const peakColor = theme.primary;
		const lowColor = theme.background; // Very dark background

		// Create the color with enhanced contrast
		return blendColors(lowColor, peakColor, factor, alpha);
	}

	// Check if the audio is paused or spectrum is all zeros
	function hasActiveSignal(spectrumData: Uint8Array): boolean {
		// Use the imported isPlaying store to check playback state
		return $isPlaying && spectrumData.some(val => val > 0);
	}

	// Draw the frequency spectrum - this will be called by BaseVisualizer
	function drawSpectrum() {
		if (!ctx) return;

		// Clear the canvas
		ctx.clearRect(0, 0, width, height);

		// Get the current spectrum data
		const spectrumData = $spectrum;
		if (!spectrumData || spectrumData.length === 0) {
			return;
		}
		
		// Check if the audio is paused or spectrum is all zeros
		const hasSignal = hasActiveSignal(spectrumData);
		
		// If no signal, draw a flat line and return
		if (!hasSignal) {
			ctx.strokeStyle = theme.primary;
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(0, height);
			ctx.lineTo(width, height);
			ctx.stroke();
			
			// Even if paused, we still draw the crosshair and tooltip if hovering
			if (isHovering) {
				// Draw crosshair lines
				drawCrosshairLine(0, mouseY, width, mouseY);
				drawCrosshairLine(mouseX, 0, mouseX, height);
				
				// Draw tooltip
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
				
				// Draw a vertical reference line
				drawReferenceLine(ctx, mouseX, height, theme.primary, 0.5);
			}
			
			return;
		}

		// Rest of the drawing code for when there is a signal
		// Calculate how many points to draw
		const pointCount = width;
		const points: { x: number; y: number; amplitude: number }[] = [];
		
		// Reset peak tracking for this frame
		peakAmplitude = 0;
		peakX = 0;

		// Process each point
		for (let i = 0; i < pointCount; i++) {
			const xPercent = i / pointCount;

			// Use original scaling approach for frequency distribution
			const logPos = minFreqPercent + (1 - minFreqPercent) * Math.pow(xPercent, freqScalingPower);

			// Calculate exact position in the data array (with decimal part)
			const exactIndex = logPos * spectrumData.length;

			// Get integer part and fractional part for interpolation
			const indexLow = Math.floor(exactIndex);

			// For better interpolation, get 4 points for cubic interpolation when possible
			let value: number;
			const mu = exactIndex - indexLow; // Fractional part

			if (indexLow > 0 && indexLow < spectrumData.length - 2) {
				// We have enough points for cubic interpolation
				const y0 = spectrumData[indexLow - 1];
				const y1 = spectrumData[indexLow];
				const y2 = spectrumData[indexLow + 1];
				const y3 = spectrumData[indexLow + 2];
				value = cubicInterpolate(y0, y1, y2, y3, mu);
			} else {
				// Fallback to linear interpolation at edges
				const indexHigh = Math.min(spectrumData.length - 1, indexLow + 1);
				const valueLow = spectrumData[indexLow];
				const valueHigh = spectrumData[indexHigh];
				value = valueLow + mu * (valueHigh - valueLow);
			}

			// Apply temporal smoothing if we have previous data
			if (prevSpectrum[i] !== undefined) {
				// Fast attack, slow release: respond quickly to rises but fall off slowly
				const smoothFactor = value > prevSpectrum[i] ? 0.3 : temporalSmoothing;
				value = prevSpectrum[i] * smoothFactor + value * (1 - smoothFactor);
			}

			// Store for next frame
			prevSpectrum[i] = value;

			// Normalize to 0-1 range
			const amplitude = value / 255;

			// Calculate y position with height scaling
			const y = height - amplitude * height * 0.7 * scale * heightScaleFactor;

			// Store the point
			points.push({ x: i, y, amplitude });
			
			// Track peak for loudest frequency
			if (amplitude > peakAmplitude) {
				peakAmplitude = amplitude;
				peakX = i;
				peakFrequency = xToFrequency(i);
			}
		}

		// Fill the area under the curve with energy-based coloring
		for (let i = 0; i < points.length; i++) {
			const { x, y, amplitude } = points[i];

			// Skip if we're at the right edge
			if (i >= points.length - 1) continue;

			// Get the next point
			const nextPoint = points[i + 1];

			// Calculate the width of this segment
			const segmentWidth = nextPoint.x - x;

			// Get more dramatic coloring with high contrast
			ctx.fillStyle = intensifyColor(amplitude);

			// Fill this vertical slice with the calculated color
			ctx.fillRect(x, y, segmentWidth, height - y);
		}

		// Now draw the line for crisp definition
		ctx.lineWidth = 1;
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';
		ctx.strokeStyle = theme.primary;

		ctx.beginPath();

		// Draw the line connecting all points
		for (let i = 0; i < points.length; i++) {
			const { x, y } = points[i];

			if (i === 0) {
				ctx.moveTo(x, y);
			} else {
				ctx.lineTo(x, y);
			}
		}

		// Stroke the line
		ctx.stroke();
		
		// Draw crosshair lines when hovering
		if (isHovering) {
			// Draw horizontal and vertical lines
			drawCrosshairLine(0, mouseY, width, mouseY);
			drawCrosshairLine(mouseX, 0, mouseX, height);
		}
		
		// If hovering, show tooltip at mouse position
		if (isHovering) {
			// Draw tooltip
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
			
			// Draw a vertical reference line
			drawReferenceLine(ctx, mouseX, height, theme.primary, 0.5);
		} 
		// Otherwise, show tooltip at peak frequency position
		else if (peakAmplitude > 0.1) { // Only show if there's a significant peak
			const peakY = points[peakX]?.y || height / 2;
			
			// Draw tooltip at peak position
			drawFrequencyTooltip({
				ctx,
				x: peakX,
				y: peakY,
				width,
				frequency: peakFrequency,
				backgroundColor: theme.primary,
				textColor: theme.background,
				showNote: true,
				formatNote
			});
			
			// Draw a circle at the peak point for better visibility
		
		}
	}

	// Function to draw a solid crosshair line
	function drawCrosshairLine(x1: number, y1: number, x2: number, y2: number) {
		if (!ctx) return;
		
		// Draw a subtle shadow for better contrast
		ctx.globalCompositeOperation = 'difference';
		ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
		ctx.globalCompositeOperation = 'source-over';
		
		// Draw a solid line with primary color
		ctx.strokeStyle = theme.primary;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(x1, y1);
		ctx.lineTo(x2, y2);
		ctx.stroke();
	}

	// Add event listener for window resize
	if (browser) {
		window.addEventListener('resize', checkScreenSize);
	}
</script>

<BaseHoverableVisualizer
	on:ready={handleReady}
	on:resize={handleResize}
	on:mousemove={handleMouseMove}
	on:mouseleave={handleMouseLeave}
	id="frequency-spectrum"
	title="Frequency Spectrum"
	titlePosition="top"
	draw={drawSpectrum}
/>
